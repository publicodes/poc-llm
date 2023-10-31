import cors from "@koa/cors";
import Router from "@koa/router";
import { koaMiddleware as publicodesAPI } from "@publicodes/api";
import Koa from "koa";
import Engine from "publicodes";
import { parse } from "yaml";

import rules from "./rules.json" assert { type: "json" };

//interface State extends Koa.DefaultState {}

//interface Context extends Koa.DefaultContext {}

const app = new Koa();
const router = new Router();

app.use(cors());

// Create middleware with your Engine
const apiRoutes = publicodesAPI(new Engine(rules));

// Basic routes usage (/evaluate, /rules, etc.)
router.use(apiRoutes);

// Or use with specific route prefix (/v1/evaluate, /v1/rules, etc.)
router.use("/v1", apiRoutes);

app.use(router.routes());
app.use(router.allowedMethods());

const port = 3002;

app.listen(port, function () {
  console.log("listening on port:", port);
});
