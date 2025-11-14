import { z } from "zod"

export default z.object({ "source": z.string().describe("Source node ID"), "target": z.string().describe("Target node ID"), "weight": z.number().describe("Edge weight") }).describe("An edge used in FCM simulation (simplified version without React Flow handles)")
