import BaseTransformer from '../BaseTransformer';

class LeaderboardOutputTransformer extends BaseTransformer {
  transform(leaderboardEntry: any) {
    return leaderboardEntry
  }
}

export default new LeaderboardOutputTransformer();