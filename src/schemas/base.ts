import { z } from "zod";

/**
 * Base schema for common PouchDB document fields
 * All document schemas should extend this
 */
export const PouchDBFieldsSchema = z.object({
  _id: z.string().optional(),
  _rev: z.string().optional(),
  $collection: z.string(),
  modifiedByUsername: z.string().optional(),
  modifiedEpoch: z.number().optional(),
});

/**
 * Base document schema that can be extended by specific collection schemas
 */
export const BaseDocumentSchema = PouchDBFieldsSchema;
