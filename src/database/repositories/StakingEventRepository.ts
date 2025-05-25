import { StakingEventModel } from "../models";
import BaseRepository from "./BaseRepository";
import { QueryBuilder } from "objection";
import Pagination, { IPaginationRequest } from "../../utils/Pagination";
import { ITransformer } from "../../interfaces";

interface IPaginationQuery {
  contractAddress?: string;
  tokenId?: string;
}
class StakingEventRepository extends BaseRepository {
  getModel() {
    return StakingEventModel
  }

  async paginate(
    perPage = 10,
    page = 1,
    query : IPaginationQuery = {},
    transformer?: ITransformer,
  ) {
    let contractAddress = query.contractAddress ? query.contractAddress : null;

    const results = await this.model.query().where(function (this: QueryBuilder<StakingEventModel>) {
      if (contractAddress) {
        this.where('contract_address', contractAddress);
      }
    })
    .withGraphFetched('[evm_transaction]')
    .orderBy('block_number', 'DESC')
    .page(page - 1, perPage)

    return this.parserResult(new Pagination(results, perPage, page), transformer);
  }

  async findEventByEventFingerprint(eventFingerprint: string) {

    const result = await this.model.query().where(function (this: QueryBuilder<StakingEventModel>) {
      this.where("event_fingerprint", eventFingerprint);
    })

    if (result.length === 0) {
      return null;
    }

    return this.parserResult(result);
    
  }

  async clearRecordsByContractAddress(contractAddress: string) {
    return await this.model.query().where("contract_address", contractAddress).delete();
  }

  async clearRecordsByContractAddressAboveOrEqualToBlockNumber(network: string, contractAddress: string, blockNumber: number, eventType: string) {
    return await this.model.query().where(function (this: QueryBuilder<StakingEventModel>) {
      this.where("network_name", network);
      this.where("contract_address", contractAddress);
      this.where('block_number', ">=", blockNumber);
      this.where('type', eventType);
    }).delete();
  }

  async getStakingLeaderboard(
    stakingContractAddresses: string[],
    pagination: IPaginationRequest,
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const rawResult = await this.model.knex().raw(`
      WITH FilteredEvents AS (
        SELECT *
        FROM public.staking_event
        WHERE contract_address = ANY(?::text[])
        ORDER BY id ASC
      ),
      
      RunningBalances AS (
        SELECT
          staker,
          staking_module,
          SUM(COALESCE(NULLIF(pro_reward, '')::numeric, 0)) AS total_pro_rewards_withdrawn,
          SUM(COALESCE(NULLIF(pro_reward_foregone, '')::numeric, 0)) AS total_pro_rewards_foregone,
          SUM(COALESCE(NULLIF(staking_power_issued, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(staking_power_burnt, '')::numeric, 0)) AS current_staking_power,
          SUM(COALESCE(NULLIF(virtual_pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(virtual_pro_amount_removed, '')::numeric, 0)) AS current_virtual_pro_amount,
          SUM(COALESCE(NULLIF(pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(pro_amount_removed, '')::numeric, 0)) AS current_pro_amount
        FROM FilteredEvents
        GROUP BY staker, staking_module
      ),
      
      GlobalTotals AS (
        SELECT
          staker,
          SUM(COALESCE(NULLIF(pro_reward, '')::numeric, 0)) AS total_pro_rewards_withdrawn,
          SUM(COALESCE(NULLIF(pro_reward_foregone, '')::numeric, 0)) AS total_pro_rewards_foregone,
          SUM(COALESCE(NULLIF(staking_power_issued, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(staking_power_burnt, '')::numeric, 0)) AS total_staking_power,
          SUM(COALESCE(NULLIF(virtual_pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(virtual_pro_amount_removed, '')::numeric, 0)) AS total_virtual_pro_amount,
          SUM(COALESCE(NULLIF(pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(pro_amount_removed, '')::numeric, 0)) AS total_pro_amount
        FROM FilteredEvents
        GROUP BY staker
      ),
      
      LeaderboardData AS (
        SELECT
          gt.staker,
          gt.total_pro_rewards_withdrawn,
          gt.total_pro_rewards_foregone,
          gt.total_staking_power,
          gt.total_virtual_pro_amount,
          gt.total_pro_amount,
          json_object_agg(
            COALESCE(rb.staking_module, 'unknown'),
            json_build_object(
              'staking_power', rb.current_staking_power,
              'virtual_pro_amount', rb.current_virtual_pro_amount,
              'pro_amount', rb.current_pro_amount,
              'pro_rewards_withdrawn', rb.total_pro_rewards_withdrawn,
              'pro_rewards_foregone', rb.total_pro_rewards_foregone
            )
          ) AS staking_modules
        FROM GlobalTotals gt
        LEFT JOIN RunningBalances rb ON gt.staker = rb.staker
        GROUP BY
          gt.staker,
          gt.total_pro_rewards_withdrawn,
          gt.total_pro_rewards_foregone,
          gt.total_staking_power,
          gt.total_virtual_pro_amount,
          gt.total_pro_amount
        ORDER BY gt.total_staking_power DESC
      ),
      
      TotalCount AS (
        SELECT COUNT(*) AS total FROM LeaderboardData
      )
      
      SELECT 
        ld.*,
        (SELECT total FROM TotalCount) AS total_count
      FROM LeaderboardData ld
      LIMIT ? OFFSET ?
    `, [stakingContractAddresses, perPage, page - 1]);
    
    const { rows } = rawResult;
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    return this.parserResult(
      new Pagination(
        {
          results: rows,
          total: totalCount
        },
        perPage,
        page
      ),
      transformer
    );
  }

  async getFullStakingLeaderboard(
    stakingContractAddresses: string[],
  ) {

    const rawResult = await this.model.knex().raw(`
      WITH FilteredEvents AS (
        SELECT *
        FROM public.staking_event
        WHERE contract_address = ANY(?::text[])
        ORDER BY id ASC
      ),
      
      RunningBalances AS (
        SELECT
          staker,
          staking_module,
          SUM(COALESCE(NULLIF(pro_reward, '')::numeric, 0)) AS total_pro_rewards_withdrawn,
          SUM(COALESCE(NULLIF(pro_reward_foregone, '')::numeric, 0)) AS total_pro_rewards_foregone,
          SUM(COALESCE(NULLIF(staking_power_issued, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(staking_power_burnt, '')::numeric, 0)) AS current_staking_power,
          SUM(COALESCE(NULLIF(virtual_pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(virtual_pro_amount_removed, '')::numeric, 0)) AS current_virtual_pro_amount,
          SUM(COALESCE(NULLIF(pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(pro_amount_removed, '')::numeric, 0)) AS current_pro_amount
        FROM FilteredEvents
        GROUP BY staker, staking_module
      ),
      
      GlobalTotals AS (
        SELECT
          staker,
          SUM(COALESCE(NULLIF(pro_reward, '')::numeric, 0)) AS total_pro_rewards_withdrawn,
          SUM(COALESCE(NULLIF(pro_reward_foregone, '')::numeric, 0)) AS total_pro_rewards_foregone,
          SUM(COALESCE(NULLIF(staking_power_issued, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(staking_power_burnt, '')::numeric, 0)) AS total_staking_power,
          SUM(COALESCE(NULLIF(virtual_pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(virtual_pro_amount_removed, '')::numeric, 0)) AS total_virtual_pro_amount,
          SUM(COALESCE(NULLIF(pro_amount_entered, '')::numeric, 0)) - 
          SUM(COALESCE(NULLIF(pro_amount_removed, '')::numeric, 0)) AS total_pro_amount
        FROM FilteredEvents
        GROUP BY staker
      ),
      
      LeaderboardData AS (
        SELECT
          gt.staker,
          gt.total_pro_rewards_withdrawn,
          gt.total_pro_rewards_foregone,
          gt.total_staking_power,
          gt.total_virtual_pro_amount,
          gt.total_pro_amount,
          json_object_agg(
            COALESCE(rb.staking_module, 'unknown'),
            json_build_object(
              'staking_power', rb.current_staking_power,
              'virtual_pro_amount', rb.current_virtual_pro_amount,
              'pro_amount', rb.current_pro_amount,
              'pro_rewards_withdrawn', rb.total_pro_rewards_withdrawn,
              'pro_rewards_foregone', rb.total_pro_rewards_foregone
            )
          ) AS staking_modules
        FROM GlobalTotals gt
        LEFT JOIN RunningBalances rb ON gt.staker = rb.staker
        GROUP BY
          gt.staker,
          gt.total_pro_rewards_withdrawn,
          gt.total_pro_rewards_foregone,
          gt.total_staking_power,
          gt.total_virtual_pro_amount,
          gt.total_pro_amount
        ORDER BY gt.total_staking_power DESC
      ),
      
      TotalCount AS (
        SELECT COUNT(*) AS total FROM LeaderboardData
      )
      
      SELECT 
        ld.*,
        (SELECT total FROM TotalCount) AS total_count
      FROM LeaderboardData ld
    `, [stakingContractAddresses]);

    return {
      data: rawResult.rows
    }
  }


}

export default new StakingEventRepository()
