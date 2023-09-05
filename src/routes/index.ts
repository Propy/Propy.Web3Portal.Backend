'use strict';

import { Express } from "express";

const AuthRoutes = require('./auth.routes');
const BalanceRoutes = require('./balance.routes');
const AssetRoutes = require('./asset.routes');
const NftRoutes = require('./nft.routes');

// Protected routes
const AdminRoutes = require("./admin.routes")

export default function routes(app: Express) {
  app.use("", AuthRoutes);
  app.use("", BalanceRoutes);
  app.use("", AssetRoutes);
  app.use("", NftRoutes);
  // protected routes
  app.use("", AdminRoutes);
}