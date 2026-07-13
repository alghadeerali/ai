import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import personasRouter from "./personas";
import searchRouter from "./search";
import usageRouter from "./usage";
import modelsRouter from "./models";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/projects", projectsRouter);
router.use("/conversations", conversationsRouter);
router.use("/conversations/:id/messages", messagesRouter);
router.use("/personas", personasRouter);
router.use("/search", searchRouter);
router.use("/usage", usageRouter);
router.use("/models", modelsRouter);

export default router;
