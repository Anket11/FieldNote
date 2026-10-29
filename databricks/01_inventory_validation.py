# Databricks notebook source
# MAGIC %md
# MAGIC # Procurement Silver: source inventory
# MAGIC Reads Bronze without modifying it. Rebuilds only the inventory tables in the configured Silver schema.
# COMMAND ----------
import os, json, hashlib, collections
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

def widget(name, default):
    try: return dbutils.widgets.get(name)
    except Exception:
        dbutils.widgets.text(name, default)
        return default
BRONZE = widget('bronze_root', '/Volumes/main/procurement_demo_bronze/raw_files')
SILVER = widget('silver_schema', 'main.procurement_demo_silver')
assert all(x.replace('_','').isalnum() for x in SILVER.split('.')) and len(SILVER.split('.')) == 2
spark.sql(f'CREATE SCHEMA IF NOT EXISTS {SILVER}')
RUN_AT = datetime.now(timezone.utc).isoformat()
def digest(value): return hashlib.sha256(value.encode() if isinstance(value,str) else value).hexdigest()
def save(rows, table, schema):
    spark.createDataFrame(rows, schema).write.mode('overwrite').option('overwriteSchema','true').saveAsTable(f'{SILVER}.{table}')
def recorded_source_urls(bronze_root):
    # Use exact saved request URLs; never infer a permalink from a package or record ID.
    candidates = collections.defaultdict(set)
    for log in sorted((Path(bronze_root) / '_runs').rglob('source_pages.json')):
        pages = json.loads(log.read_text(encoding='utf-8'))
        if not isinstance(pages, list):
            raise ValueError('Expected a list in ingestion log: ' + str(log))
        for page in pages:
            if not isinstance(page, dict):
                continue
            path, url = page.get('bronze_path'), page.get('url')
            if not isinstance(path, str) or not isinstance(url, str):
                continue
            parsed = urlsplit(url)
            if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
                continue
            normalized_path = str(Path(path.removeprefix('dbfs:').removeprefix('file:')))
            candidates[normalized_path].add(url)
    return candidates


# COMMAND ----------
request_urls = recorded_source_urls(BRONZE)
sources, records, issues = [], [], []
def issue(source_id, code, detail):
    issues.append((digest(source_id+code+detail), source_id, code, detail, RUN_AT))
for folder in ['projects', 'reference']:
    start = Path(BRONZE)/folder
    if not start.exists(): continue
    for path in sorted(start.rglob('*')):
        if not path.is_file(): continue
        rel = str(path.relative_to(BRONZE)); parts=rel.split('/')
        if 'documents' not in parts and 'structured_data' not in parts: continue
        project = parts[1] if folder=='projects' else ('COUNTRY_'+parts[2] if parts[1]=='country' else 'GLOBAL')
        sid=digest(rel); content=path.read_bytes(); sha=digest(content); ext=path.suffix.lower().lstrip('.')
        kind='document' if 'documents' in parts else 'structured'
        ix=parts.index('documents' if kind=='document' else 'structured_data')
        category=parts[ix+1]; original_id=parts[ix+2] if kind=='document' else category
        version=parts[parts.index('versions')+1] if 'versions' in parts else parts[ix+2]
        if not content: issue(sid,'EMPTY_FILE',rel)
        if 'versions' in parts and version!=sha: issue(sid,'HASH_MISMATCH',rel)
        if ext=='pdf' and not content.startswith(b'%PDF-'): issue(sid,'INVALID_PDF_HEADER',rel)
        source_date=None; date_kind=None
        if kind=='structured': source_date=version;date_kind='retrieval_snapshot'
        source_url = None
        if kind == 'structured':
            saved_urls = request_urls.get(str(path), set())
            if len(saved_urls) == 1:
                source_url = next(iter(saved_urls))
            elif len(saved_urls) > 1:
                issue(sid, 'AMBIGUOUS_SOURCE_URL', rel)
        sources.append([sid,project,original_id,kind,category,ext,str(path),rel,len(content),sha,version,source_date,date_kind,source_url,RUN_AT])
        if kind!='structured': continue
        try:
            payload=json.loads(content)
            rootkey={'projects':'projects','contracts':'contract','notices':'procnotices','finance':'data','document_catalogue':'documents'}.get(category)
            if isinstance(payload,list) and len(payload)==2 and isinstance(payload[0],dict):
                total=payload[0].get('total');rootkey='1';raw_data=payload[1] or []
            else:
                if not rootkey or rootkey not in payload: raise ValueError('Unknown structured envelope: '+category)
                raw_data=payload[rootkey];total=payload.get('total',payload.get('count'))
            entries=[(k,v) for k,v in raw_data.items() if k!='facets' and isinstance(v,dict)] if isinstance(raw_data,dict) else list(enumerate(raw_data))
            data=[v for k,v in entries]
            if total is not None and int(total)!=len(data):issue(sid,'INCOMPLETE_SNAPSHOT',f'Expected {total}; found {len(data)}')
            seen=set()
            for i,(locator_key,r) in enumerate(entries):
                native=str(r.get('contr_id') or r.get('id') or r.get('project_id') or r.get('loan_number') or i)
                if isinstance(r.get('indicator'),dict):native=str(r['indicator'].get('id'))+'|'+str(r.get('date'))
                if category=='finance':native=str(r.get('loan_number'))+'|'+str(r.get('end_of_period'))
                if native in seen:issue(sid,'DUPLICATE_RECORD_KEY',native)
                seen.add(native)
                records.append((digest(sid+'|'+str(i)),sid,project,category,native,f'/{rootkey}/{locator_key}',json.dumps(r,ensure_ascii=False),RUN_AT))
        except Exception as e:issue(sid,'INVALID_JSON',str(e))
# Enrich document dates and URLs from the saved catalogue; never treat retrieval time as publication date.
catalog={}
for r in records:
    if r[3]=='document_catalogue':
        d=json.loads(r[6]);catalog[(r[2],str(d.get('id')))]=d
for row in sources:
    if row[3]=='document':
        meta=catalog.get((row[1],row[2]),{})
        row[11]=meta.get('docdt'); row[12]='publication' if row[11] else None
        row[13]=meta.get('pdfurl') or meta.get('url')
byhash=collections.defaultdict(list)
for row in sources:byhash[row[9]].append(row[0])
for sha,ids in byhash.items():
    if len(ids)>1:
        for sid in ids:issue(sid,'DUPLICATE_CONTENT',sha)
assert sources, 'No Bronze sources found'
save(sources,'sources','source_id string, project_id string, native_source_id string, source_kind string, category string, file_type string, bronze_path string, relative_path string, size_bytes long, file_hash string, version string, source_date string, date_kind string, source_url string, inventoried_at string')
save(records,'source_records','record_id string, source_id string, project_id string, record_type string, native_record_id string, record_locator string, record_json string, inventoried_at string')
save(issues,'inventory_issues','issue_id string, source_id string, issue_code string, detail string, checked_at string')
summary={'sources':len(sources),'documents':sum(r[3]=='document' for r in sources),'records':len(records),'issues':len(issues),'by_project':dict(collections.Counter(r[1] for r in sources)),'record_types':dict(collections.Counter(r[3] for r in records))}
print(json.dumps(summary,indent=2))
assert not any(x[2] in {'EMPTY_FILE','HASH_MISMATCH','INVALID_PDF_HEADER','INVALID_JSON','INCOMPLETE_SNAPSHOT'} for x in issues), 'Source validation failed; inspect inventory_issues'
dbutils.notebook.exit(json.dumps(summary))
