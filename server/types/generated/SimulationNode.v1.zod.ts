import { z } from "zod"

export default z.object({ "id": z.string().describe("Unique node identifier"), "label": z.string().describe("Human-readable node label"), "value": z.number().describe("Node value") }).describe("A node used in FCM simulation")
