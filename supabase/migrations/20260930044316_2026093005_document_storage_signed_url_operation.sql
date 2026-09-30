-- CargoDesk private document Storage: permit authenticated signed-URL generation
-- Scope: Storage SELECT policy only. Preserve CargoDesk document authorization helper.
-- This is required because createSignedUrl() uses the Storage signed-object operation,
-- while authenticated direct retrieval uses object.get_authenticated.

BEGIN;

DROP POLICY IF EXISTS "cargodesk_documents_view 1n8n0ow_0" ON storage.objects;

CREATE POLICY "cargodesk_documents_view 1n8n0ow_0"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    (
      storage.allow_only_operation('object.get_authenticated'::text)
      OR storage.allow_only_operation('object.sign'::text)
    )
    AND private.cargodesk_storage_document_access(
      bucket_id,
      name,
      'VIEW'::text
    )
  );

COMMIT;
