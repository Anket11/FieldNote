-- Run as the catalog/schema/table owner or an administrator.
-- Replace <CLIENT_ID> with the service principal's Application ID, not its display name.
-- This file grants read access only. It does not create data or compute resources.
GRANT USE CATALOG ON CATALOG main TO `<CLIENT_ID>`;
GRANT USE SCHEMA ON SCHEMA main.procurement_demo_silver TO `<CLIENT_ID>`;
GRANT USE SCHEMA ON SCHEMA main.procurement_demo_gold TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.rag_chunks_backend_index TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.rag_chunks TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.rag_procurement_links TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.package_comparisons TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.facts TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.requirements TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.award_prices TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.schedule_events TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_gold.risk_evidence TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_silver.sources TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_silver.source_records TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_silver.projects TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_silver.awards TO `<CLIENT_ID>`;
GRANT SELECT ON TABLE main.procurement_demo_silver.notices TO `<CLIENT_ID>`;
-- Also grant CAN USE on the SQL warehouse and CAN QUERY on the query-embedding
-- endpoint through their Permissions dialogs. Keep OAuth scopes restricted to
-- sql, vector-search, and model-serving-inference.
