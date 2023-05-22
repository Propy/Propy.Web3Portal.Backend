'use strict';

import { Express } from "express";

const BalanceRoutes = require('./balance.routes');
const ValueSnapshotRoutes = require('./value-snapshot.routes');
const ResyncRoutes = require('./resync.routes');
const AssetRoutes = require('./asset.routes');

export default function routes(app: Express) {
  app.use("", BalanceRoutes);
  app.use("", ValueSnapshotRoutes);
  app.use("", ResyncRoutes);
  app.use("", AssetRoutes);
}