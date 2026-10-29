# Databricks notebook source
# MAGIC %md
# MAGIC # 09 — Backend data access
# MAGIC Reuses notebook 07's persisted chunks, embeddings, lineage and procurement tables.
# MAGIC Notebook 07 builds its cosine/BM25 indexes in driver memory; it does not configure a managed search endpoint.
# MAGIC This notebook can attach an existing compatible managed index or provision a Delta Sync index over the saved vectors.
# MAGIC **Default: inspect only.** Set `apply_setup=true` to create resources. No Bronze/Silver/Gold source tables are overwritten.
# MAGIC Provisioning, SQL queries and the optional query-embedding check incur Databricks charges.
# MAGIC Run on Unity Catalog-enabled Databricks compute with the Databricks SDK installed. No notebook 07/08 execution is required.

# COMMAND ----------
import json
import math
import re
import time
from urllib.parse import quote
from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import NotFound
from pyspark.sql import functions as F, Window


def widget(name, default):
    try:
        return dbutils.widgets.get(name).strip()
    except Exception:
        dbutils.widgets.text(name, default)
        return default


def identifier(value, parts=3):
    if not isinstance(value, str) or len(value.split('.')) != parts or any(
        not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', part) for part in value.split('.')
    ):
        raise ValueError('Use simple catalog.schema.table identifiers (catalog.schema for schemas).')
    return '.'.join('`' + part + '`' for part in value.split('.'))


def normalized_vector(response, dimension):
    data = response.get('data', [])
    if len(data) != 1 or data[0].get('index') != 0:
        raise ValueError('Embedding endpoint must return one vector at index zero.')
    vector = data[0].get('embedding', [])
    if not isinstance(vector, list) or len(vector) != dimension or not vector or any(
        isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in vector
    ):
        raise ValueError('Query embedding has an invalid value or dimension.')
    length = math.sqrt(sum(value * value for value in vector))
    if not length or not math.isfinite(length):
        raise ValueError('Query embedding must have a finite non-zero norm.')
    return [value / length for value in vector]


S = widget('silver_schema', 'main.procurement_demo_silver')
G = widget('gold_schema', 'main.procurement_demo_gold')
identifier(S, 2)
identifier(G, 2)
EMBEDDING_ENDPOINT = widget('embedding_endpoint', 'databricks-gte-large-en')
SEARCH_ENDPOINT = widget('search_endpoint', 'procurement-search')
if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,99}', SEARCH_ENDPOINT):
    raise ValueError('Use a simple search endpoint name, without URLs or spaces.')
INDEX_NAME = widget('index_name', G + '.rag_chunks_backend_index')
SERVING_TABLE = G + '.rag_chunks_backend_search'
WAREHOUSE_ID = widget('sql_warehouse_id', '')
APPLY = widget('apply_setup', 'false').lower() == 'true'
VERIFY = widget('run_access_checks', 'false').lower() == 'true'
identifier(INDEX_NAME)
identifier(SERVING_TABLE)
w = WorkspaceClient()
print('Mode:', 'APPLY' if APPLY else 'INSPECT ONLY')
print('Access checks:', 'enabled (query/warehouse charges apply)' if VERIFY else 'disabled')

# COMMAND ----------
# MAGIC %md
# MAGIC ## 1. Validate the existing data and saved vectors
# MAGIC Checks run in Spark. Only aggregate statistics and schema metadata are collected to the driver.
# MAGIC This matches 07's endpoint/text/source hash checks, without rebuilding embeddings or loading the corpus into Python.

# COMMAND ----------
TABLES = {name: S + '.' + name for name in ['projects', 'awards', 'notices', 'sources', 'source_records']}
TABLES.update({name: G + '.' + name for name in [
    'package_comparisons', 'facts', 'requirements', 'award_prices', 'schedule_events',
    'risk_evidence', 'rag_chunks', 'rag_embedding_cache', 'rag_procurement_links'
]})
for name in TABLES.values():
    if not spark.catalog.tableExists(name):
        raise ValueError('Required existing table is missing or not visible: ' + name)

chunks = spark.table(TABLES['rag_chunks'])
cache = spark.table(TABLES['rag_embedding_cache'])
sources = spark.table(TABLES['sources'])
required = {
    'chunks': (chunks, ['chunk_id', 'passage_id', 'text', 'text_hash', 'embedding_key', 'source_id', 'file_hash', 'source_project_id', 'document_type']),
    'cache': (cache, ['embedding_key', 'endpoint', 'embedded_at', 'text_hash', 'vector']),
    'sources': (sources, ['source_id', 'file_hash', 'bronze_path']),
}
for name, (frame, columns) in required.items():
    missing = sorted(set(columns) - set(frame.columns))
    if missing:
        raise ValueError(name + ' is missing columns: ' + ', '.join(missing))


def reject_rows(frame, message):
    if frame.limit(1).count():
        raise ValueError(message)


reject_rows(chunks.filter(F.col('chunk_id').isNull() | F.col('text').isNull() | (F.length('text') == 0)), 'Chunks need an ID and non-empty text.')
reject_rows(chunks.groupBy('chunk_id').count().filter('count > 1'), 'Chunk IDs are not unique.')
reject_rows(sources.groupBy('source_id').count().filter('count > 1'), 'Source IDs are not unique.')
latest = (cache.filter(F.col('endpoint') == EMBEDDING_ENDPOINT)
          .withColumn('_latest', F.row_number().over(Window.partitionBy('embedding_key').orderBy(F.col('embedded_at').desc())))
          .filter('_latest = 1').drop('_latest'))
joined = (chunks.alias('c').join(latest.alias('e'), F.col('c.embedding_key') == F.col('e.embedding_key'), 'left')
          .join(sources.alias('s'), F.col('c.source_id') == F.col('s.source_id'), 'left'))

def optional(frame, alias, name, kind='string'):
    return F.col(alias + '.' + name).cast(kind) if name in frame.columns else F.lit(None).cast(kind)


locator = optional(chunks, 'c', 'source_locator')
source_records = spark.table(TABLES['source_records'])
if 'record_id' in chunks.columns and {'record_id', 'record_locator'} <= set(source_records.columns):
    reject_rows(source_records.groupBy('record_id').count().filter('count > 1'), 'Source record IDs are not unique.')
    joined = joined.join(source_records.alias('r'), F.col('c.record_id') == F.col('r.record_id'), 'left')
    locator = F.coalesce(locator, F.col('r.record_locator'))
reject_rows(joined.filter(
    F.col('e.embedding_key').isNull() | F.col('e.text_hash').isNull() | F.col('c.text_hash').isNull() |
    (F.col('c.text_hash') != F.col('e.text_hash')) | (F.sha2(F.col('c.text'), 256) != F.col('c.text_hash')) |
    F.col('s.source_id').isNull() | F.col('c.file_hash').isNull() | F.col('s.file_hash').isNull() |
    (F.col('c.file_hash') != F.col('s.file_hash')) | F.col('s.bronze_path').isNull() |
    (F.length(F.trim(F.col('s.bronze_path'))) == 0) | locator.isNull() | (F.length(F.trim(locator)) == 0)
), 'Missing/stale embeddings or broken source lineage. Fix upstream data; this notebook never regenerates embeddings.')

prepared = joined.select(
    *[F.col('c.' + column).alias(column) for column in ['chunk_id', 'passage_id', 'text', 'text_hash', 'source_id', 'source_project_id', 'document_type', 'file_hash']],
    locator.alias('source_locator'),
    F.col('s.bronze_path').alias('bronze_path'),
    optional(chunks, 'c', 'record_id').alias('record_id'),
    optional(chunks, 'c', 'page_start', 'int').alias('page_start'),
    optional(chunks, 'c', 'page_end', 'int').alias('page_end'),
    F.coalesce(optional(chunks, 'c', 'source_url'), optional(sources, 's', 'source_url')).alias('source_url'),
    F.lit(EMBEDDING_ENDPOINT).alias('embedding_endpoint'),
    F.transform(F.col('e.vector'), lambda value: value.cast('double')).alias('vector'),
)
reject_rows(prepared.filter(F.col('vector').isNull() | (F.size('vector') == 0) | F.exists('vector', lambda value: value.isNull() | F.isnan(value) | (F.abs(value) == float('inf')))), 'Invalid saved vectors.')
prepared = prepared.withColumn('_norm', F.sqrt(F.aggregate('vector', F.lit(0.0), lambda total, value: total + value * value)))
reject_rows(prepared.filter((F.col('_norm') == 0) | F.isnan('_norm') | (F.col('_norm') == float('inf'))), 'Invalid vector norm.')
stats = prepared.agg(F.count('*').alias('rows'), F.min(F.size('vector')).alias('min_dim'), F.max(F.size('vector')).alias('max_dim')).first()
if not stats.rows or stats.min_dim != stats.max_dim:
    raise ValueError('Expected non-empty chunks with one embedding dimension.')
DIMENSION = int(stats.min_dim)
# Match 07's unit-vector cosine retrieval; this reuses vectors, not embedding model calls.
prepared = prepared.withColumn('vector', F.transform('vector', lambda value: value / F.col('_norm'))).drop('_norm')
print(json.dumps({'validated_chunks': stats.rows, 'embedding_dimension': DIMENSION, 'embedding_endpoint': EMBEDDING_ENDPOINT}))

# COMMAND ----------
# MAGIC %md
# MAGIC ## 2. Attach or provision managed search
# MAGIC If your managed index has another name, set `index_name` before running.
# MAGIC A missing index is created only with `apply_setup=true`, using a separate derived serving table.
# MAGIC Existing indexes must use this serving table/schema. Incompatible indexes are reported, never replaced.
# MAGIC Delta Sync is triggered: rerun APPLY after upstream updates to refresh the serving table and index.

# COMMAND ----------
index_path = '/api/2.0/vector-search/indexes/' + quote(INDEX_NAME, safe='')
try:
    index = w.api_client.do('GET', index_path)
except NotFound:
    index = None

if index:
    spec = index.get('delta_sync_index_spec') or {}
    vectors = spec.get('embedding_vector_columns') or []
    if (index.get('index_type') != 'DELTA_SYNC' or index.get('primary_key') != 'chunk_id' or
        spec.get('source_table') != SERVING_TABLE or
        not any(column.get('name') == 'vector' and column.get('embedding_dimension') == DIMENSION for column in vectors)):
        raise ValueError('Existing index uses a different schema/source. Inspect its descriptor and adapt the backend mapping; it will not be modified.')
    SEARCH_ENDPOINT = index['endpoint_name']

if APPLY:
    # This single derived table is the only table written; upstream source tables stay intact.
    if spark.catalog.tableExists(SERVING_TABLE):
        properties = {row.key: row.value for row in spark.sql('SHOW TBLPROPERTIES ' + identifier(SERVING_TABLE)).collect()}
        if properties.get('procurement.backend_setup') != '09-v1':
            raise ValueError('Serving table already exists but is not owned by this setup. Choose another serving table name in the notebook.')
    else:
        (prepared.limit(0).write.format('delta').option('delta.enableChangeDataFeed', 'true')
         .saveAsTable(SERVING_TABLE))
        spark.sql('ALTER TABLE ' + identifier(SERVING_TABLE) + " SET TBLPROPERTIES ('procurement.backend_setup'='09-v1')")
    prepared.createOrReplaceTempView('_procurement_backend_vectors_09')
    # MERGE retains the table identity/CDF used by an existing Delta Sync index.
    spark.sql('MERGE INTO ' + identifier(SERVING_TABLE) + ' AS target USING _procurement_backend_vectors_09 AS source '
              'ON target.chunk_id = source.chunk_id WHEN MATCHED THEN UPDATE SET * '
              'WHEN NOT MATCHED THEN INSERT * WHEN NOT MATCHED BY SOURCE THEN DELETE')
    endpoint_path = '/api/2.0/vector-search/endpoints/' + quote(SEARCH_ENDPOINT, safe='')
    try:
        endpoint = w.api_client.do('GET', endpoint_path)
    except NotFound:
        endpoint = w.api_client.do('POST', '/api/2.0/vector-search/endpoints', body={'name': SEARCH_ENDPOINT, 'endpoint_type': 'STANDARD'})
    deadline = time.monotonic() + 600
    while endpoint.get('endpoint_status', {}).get('state') != 'ONLINE':
        if time.monotonic() >= deadline or endpoint.get('endpoint_status', {}).get('state') in {'OFFLINE', 'RED_STATE', 'DELETED'}:
            raise RuntimeError('Search endpoint is not online. Inspect its status in Databricks; no automatic replacement was attempted.')
        time.sleep(10)
        endpoint = w.api_client.do('GET', endpoint_path)
    if not index:
        w.api_client.do('POST', '/api/2.0/vector-search/indexes', body={
            'name': INDEX_NAME, 'endpoint_name': SEARCH_ENDPOINT, 'primary_key': 'chunk_id', 'index_type': 'DELTA_SYNC',
            'delta_sync_index_spec': {'source_table': SERVING_TABLE, 'pipeline_type': 'TRIGGERED',
                                     'embedding_vector_columns': [{'name': 'vector', 'embedding_dimension': DIMENSION}],
                                     'columns_to_sync': [column for column in prepared.columns if column != 'vector']},
        })
    else:
        w.api_client.do('POST', index_path + '/sync')
    index = w.api_client.do('GET', index_path)
    print('Setup applied. Index population may still be running; check status before enabling the backend.')
else:
    print('No resources changed. Managed index:', INDEX_NAME, 'exists' if index else 'not found; provisioning is available with apply_setup=true')

# COMMAND ----------
# MAGIC %md
# MAGIC ## 3. Optional access checks
# MAGIC Enable `run_access_checks=true` only when the index is ready. This makes one query-embedding call,
# MAGIC one managed-index query, and SQL warehouse reads. These checks use the **notebook identity**.
# MAGIC They do not prove that the backend service principal has access. Test that identity from the backend separately.

# COMMAND ----------
CHECKS = {'index_ready': bool(index and index.get('status', {}).get('ready')), 'search': 'not_run', 'sql': 'not_run'}
if VERIFY:
    if not CHECKS['index_ready']:
        raise RuntimeError('Index is not ready. Wait for its sync to finish and rerun INSPECT with access checks enabled.')
    embedding = w.api_client.do('POST', '/serving-endpoints/' + quote(EMBEDDING_ENDPOINT, safe='') + '/invocations', body={'input': ['132 kV substation']})
    results = w.api_client.do('POST', index_path + '/query', body={
        'query_vector': normalized_vector(embedding, DIMENSION), 'query_text': '132 kV substation',
        'query_type': 'HYBRID', 'num_results': 3, 'columns': ['chunk_id', 'source_id', 'text', 'source_locator', 'bronze_path'],
    })
    CHECKS['search'] = 'passed' if (results.get('result') or {}).get('data_array') else 'no_results'
    if not WAREHOUSE_ID:
        raise ValueError('Set sql_warehouse_id to test the SQL Statement Execution API used by Next.js.')
    from databricks.sdk.service.sql import ExecuteStatementRequestOnWaitTimeout, StatementState
    for name in TABLES.values():
        reply = w.statement_execution.execute_statement(warehouse_id=WAREHOUSE_ID,
            statement='SELECT * FROM ' + identifier(name) + ' LIMIT 0', wait_timeout='30s',
            on_wait_timeout=ExecuteStatementRequestOnWaitTimeout.CANCEL)
        if not reply.status or reply.status.state != StatementState.SUCCEEDED:
            raise RuntimeError('SQL access check did not succeed for ' + name + '. Check warehouse access and table permissions.')
    CHECKS['sql'] = 'passed'
print(json.dumps(CHECKS, indent=2))

# COMMAND ----------
# MAGIC %md
# MAGIC ## 4. Backend handoff
# MAGIC Copy the non-secret configuration below to the Next.js **server** environment.
# MAGIC Configure OAuth service-principal credentials separately. Never use `NEXT_PUBLIC_` for Databricks settings.
# MAGIC An administrator must grant this identity USE CATALOG/SCHEMA, SELECT on the index and necessary tables,
# MAGIC CAN USE on the SQL warehouse, and CAN QUERY on the query-embedding endpoint.
# MAGIC No permissions, identities or credentials are created by this notebook.
# MAGIC Keep the agent loop in Next.js. Call search, SQL and source lookup through server-only tools.

# COMMAND ----------
backend_config = {
    'DATABRICKS_HOST': w.config.host.rstrip('/'),
    'DATABRICKS_SEARCH_ENDPOINT': SEARCH_ENDPOINT,
    'DATABRICKS_SEARCH_INDEX': INDEX_NAME,
    'DATABRICKS_EMBEDDING_ENDPOINT': EMBEDDING_ENDPOINT,
    'DATABRICKS_EMBEDDING_DIMENSION': str(DIMENSION),
    'DATABRICKS_SQL_WAREHOUSE_ID': WAREHOUSE_ID,
    'DATABRICKS_SILVER_SCHEMA': S,
    'DATABRICKS_GOLD_SCHEMA': G,
    'DATABRICKS_CHUNKS_TABLE': TABLES['rag_chunks'],
    'DATABRICKS_SEARCH_TABLE': SERVING_TABLE,
}
manifest = {'config': backend_config, 'tables': TABLES, 'checks': CHECKS,
            'validated_chunks': stats.rows, 'index_status': (index or {}).get('status'),
            'backend_identity_verified': False,
            'embedding_reuse': 'Saved vectors are normalized; no corpus embeddings were generated.'}
print(json.dumps(manifest, indent=2))
print('\n# Non-secret Next.js server settings; values are JSON quoted. Add OAuth credentials separately.')
for key, value in backend_config.items():
    print(key + '=' + json.dumps(value))
