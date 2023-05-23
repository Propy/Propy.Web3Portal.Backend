'use strict';

import { Express } from "express";

const BalanceRoutes = require('./balance.routes');
const AssetRoutes = require('./asset.routes');

export default function routes(app: Express) {
  app.use("", BalanceRoutes);
  app.use("", AssetRoutes);
}