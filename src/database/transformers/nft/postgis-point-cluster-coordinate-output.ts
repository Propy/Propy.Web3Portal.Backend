import BaseTransformer from '../BaseTransformer';

import { extractCoordinatesFromPointPostGIS } from '../../../utils';

import { IPostGISPointCluster } from "../../../interfaces";

class NftCoordinateOutputTransformer extends BaseTransformer {
  transform(postGISPointCluster: IPostGISPointCluster) {
    if(postGISPointCluster && postGISPointCluster.cluster_center && postGISPointCluster.point_count) {
      const coordinates = extractCoordinatesFromPointPostGIS(postGISPointCluster.cluster_center);
      return {
        ...(coordinates?.longitude && { longitude: coordinates.longitude }),
        ...(coordinates?.latitude && { latitude: coordinates.latitude}),
        ...(postGISPointCluster.point_count && { point_count: postGISPointCluster.point_count }),
      }
    }
    return null;
  }
}

export default new NftCoordinateOutputTransformer();