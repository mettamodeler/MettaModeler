import { z } from "zod"

export default z.object({ "id": z.number().int().describe("Unique user identifier").optional(), "username": z.string().describe("Unique username"), "password": z.string().describe("Hashed password (never returned in API responses)"), "displayName": z.union([z.string().describe("User's display name"), z.null().describe("User's display name")]).describe("User's display name").optional(), "role": z.string().describe("User role (user, admin, etc.)").default("user") }).describe("User account in MettaModeler")
