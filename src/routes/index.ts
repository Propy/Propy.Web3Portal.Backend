'use strict';

import { Express } from "express";

const AuthRoutes = require('./auth.routes');
const BalanceRoutes = require('./balance.routes');
const AssetRoutes = require('./asset.routes');
const NftRoutes = require('./nft.routes');
const ApiRoutes = require('./api.routes');
const SignatureRoutes = require('./signature.routes');
const BridgeRoutes = require('./bridge.routes');

// Protected routes
const AdminRoutes = require("./admin.routes")

export default function routes(app: Express) {
  app.use("", AuthRoutes);
  app.use("", BalanceRoutes);
  app.use("", AssetRoutes);
  app.use("", NftRoutes);
  app.use("", ApiRoutes);
  app.use("", SignatureRoutes);
  app.use("", BridgeRoutes);
  // protected routes
  app.use("", AdminRoutes);
}