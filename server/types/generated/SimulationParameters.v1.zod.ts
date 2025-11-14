import { z } from "zod"

export default z.object({ "activation": z.enum(["sigmoid","tanh","relu","linear"]).describe("Activation function").default("sigmoid"), "threshold": z.number().describe("Convergence threshold").default(0.001), "maxIterations": z.number().int().describe("Maximum iterations").default(20) }).describe("Parameters for FCM simulation")
