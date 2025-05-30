import BaseTransformer from '../BaseTransformer';

class StakingEventV3OutputTransformer extends BaseTransformer {
  transform(stakingEventV3Entry: any) {
    return {
      network_name: stakingEventV3Entry.network_name,
      staker: stakingEventV3Entry.staker,
      type: stakingEventV3Entry.type,
      token_address: stakingEventV3Entry.token_address,
      token_id: stakingEventV3Entry.token_id,
      pro_amount_entered: stakingEventV3Entry.pro_amount_entered,
      staking_power_issued: stakingEventV3Entry.staking_power_issued,
      pro_amount_with_reward: stakingEventV3Entry.pro_amount_with_reward,
      staking_power_burnt: stakingEventV3Entry.staking_power_burnt,
      transaction_hash: stakingEventV3Entry.transaction_hash,
      event_fingerprint: stakingEventV3Entry.event_fingerprint,
      virtual_pro_amount_entered: stakingEventV3Entry.virtual_pro_amount_entered,
      virtual_pro_amount_removed: stakingEventV3Entry.virtual_pro_amount_removed,
      pro_amount_removed: stakingEventV3Entry.pro_amount_removed,
      pro_reward: stakingEventV3Entry.pro_reward,
      pro_reward_foregone: stakingEventV3Entry.pro_reward_foregone,
      staking_module: stakingEventV3Entry.staking_module,
      block_timestamp: stakingEventV3Entry?.evm_transaction?.block_timestamp,
      block_number: stakingEventV3Entry?.block_number,
    }
  }
}

export default new StakingEventV3OutputTransformer();