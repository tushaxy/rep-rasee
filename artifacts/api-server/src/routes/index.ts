import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessRouter from "./business";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import customersRouter from "./customers";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);

export default router;
