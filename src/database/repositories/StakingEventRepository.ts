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

  async getStakingEventsV3(
    stakingContractAddresses: string[],
    pagination: IPaginationRequest,
    transformer?: ITransformer,
  ) {

    const { 
      perPage,
      page
    } = pagination;

    const results = await this.model.query().where(function (this: QueryBuilder<StakingEventModel>) {
      if (stakingContractAddresses) {
        this.whereIn('contract_address', stakingContractAddresses);
      }
    })
    .withGraphFetched('[evm_transaction]')
    .orderBy('block_number', 'DESC')
    .orderBy('transaction_index', 'DESC')
    .orderBy('log_index', 'DESC')
    .page(page - 1, perPage)

    return this.parserResult(new Pagination(results, perPage, page), transformer);

  }

  async getV3CumulativeValues(
    stakingContractAddresses: string[],
  ) {

    const rawResult = await this.model.knex().raw(`
          WITH filtered_events AS (
              -- First, get all staking events filtered by address and joined with transaction timestamps
              SELECT 
                  se.*,
                  et.block_timestamp,
                  DATE(to_timestamp(et.block_timestamp::bigint)) as utc_date
              FROM public.staking_event se
              JOIN public.evm_transaction et ON se.transaction_hash = et.hash
              WHERE se.contract_address = ANY(?::text[])
              ORDER BY se.block_number ASC, se.transaction_index ASC, se.log_index ASC
          ),
          date_range AS (
              -- Generate complete date series from one day before first event to current date
              SELECT generate_series(
                  (SELECT MIN(utc_date) - INTERVAL '1 day' FROM filtered_events)::date,
                  CURRENT_DATE,
                  '1 day'::interval
              )::date as utc_date
          ),
          daily_aggregates AS (
              -- Aggregate all metrics by UTC date
              SELECT 
                  utc_date,
                  COALESCE(SUM(CAST(pro_reward AS NUMERIC)), 0) as daily_pro_reward,
                  COALESCE(SUM(CAST(pro_reward_foregone AS NUMERIC)), 0) as daily_pro_reward_foregone,
                  COALESCE(SUM(CAST(staking_power_issued AS NUMERIC)), 0) as daily_staking_power_issued,
                  COALESCE(SUM(CAST(staking_power_burnt AS NUMERIC)), 0) as daily_staking_power_burnt,
                  COALESCE(SUM(CAST(virtual_pro_amount_entered AS NUMERIC)), 0) as daily_virtual_pro_amount_entered,
                  COALESCE(SUM(CAST(virtual_pro_amount_removed AS NUMERIC)), 0) as daily_virtual_pro_amount_removed,
                  COALESCE(SUM(CAST(pro_amount_removed AS NUMERIC)), 0) as daily_pro_amount_removed,
                  COALESCE(SUM(CAST(pro_amount_entered AS NUMERIC)), 0) as daily_pro_amount_entered
              FROM filtered_events
              GROUP BY utc_date
          ),
          complete_series AS (
              -- Join date range with aggregates to ensure all dates are present
              SELECT 
                  dr.utc_date,
                  COALESCE(da.daily_pro_reward, 0) as daily_pro_reward,
                  COALESCE(da.daily_pro_reward_foregone, 0) as daily_pro_reward_foregone,
                  COALESCE(da.daily_staking_power_issued, 0) as daily_staking_power_issued,
                  COALESCE(da.daily_staking_power_burnt, 0) as daily_staking_power_burnt,
                  COALESCE(da.daily_virtual_pro_amount_entered, 0) as daily_virtual_pro_amount_entered,
                  COALESCE(da.daily_virtual_pro_amount_removed, 0) as daily_virtual_pro_amount_removed,
                  COALESCE(da.daily_pro_amount_removed, 0) as daily_pro_amount_removed,
                  COALESCE(da.daily_pro_amount_entered, 0) as daily_pro_amount_entered
              FROM date_range dr
              LEFT JOIN daily_aggregates da ON dr.utc_date = da.utc_date
          )
          SELECT 
              utc_date,
              -- Daily totals
              daily_pro_reward,
              daily_pro_reward_foregone,
              daily_staking_power_issued,
              daily_staking_power_burnt,
              daily_virtual_pro_amount_entered,
              daily_virtual_pro_amount_removed,
              daily_pro_amount_removed,
              daily_pro_amount_entered,
              
              -- Effective pro amount entered (sum of pro_amount_entered + virtual_pro_amount_entered)
              daily_pro_amount_entered + daily_virtual_pro_amount_entered as daily_effective_pro_amount_entered,
              
              -- Daily net change in staked PRO (entered - removed)
              (daily_pro_amount_entered + daily_virtual_pro_amount_entered) - (daily_pro_amount_removed + daily_virtual_pro_amount_removed) as daily_net_pro_change,
              
              -- Daily net changes for individual components
              daily_pro_amount_entered - daily_pro_amount_removed as daily_net_pro_amount_change,
              daily_virtual_pro_amount_entered - daily_virtual_pro_amount_removed as daily_net_virtual_pro_amount_change,
              
              -- Cumulative running totals
              SUM(daily_pro_reward) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_pro_reward,
              SUM(daily_pro_reward_foregone) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_pro_reward_foregone,
              SUM(daily_staking_power_issued) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_staking_power_issued,
              SUM(daily_staking_power_burnt) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_staking_power_burnt,
              SUM(daily_virtual_pro_amount_entered) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_virtual_pro_amount_entered,
              SUM(daily_virtual_pro_amount_removed) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_virtual_pro_amount_removed,
              SUM(daily_pro_amount_removed) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_pro_amount_removed,
              SUM(daily_pro_amount_entered) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_pro_amount_entered,
              SUM(daily_pro_amount_entered + daily_virtual_pro_amount_entered) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as cumulative_effective_pro_amount_entered,
              
              -- Cumulative present amounts (running balances)
              SUM(daily_pro_amount_entered - daily_pro_amount_removed) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as present_pro_amount,
              SUM(daily_virtual_pro_amount_entered - daily_virtual_pro_amount_removed) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as present_virtual_pro_amount,
              SUM(daily_staking_power_issued - daily_staking_power_burnt) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as present_pstake_supply,
              
              -- Cumulative effective PRO amount currently present (running balance of staked PRO)
              SUM((daily_pro_amount_entered + daily_virtual_pro_amount_entered) - (daily_pro_amount_removed + daily_virtual_pro_amount_removed)) OVER (ORDER BY utc_date ROWS UNBOUNDED PRECEDING) as present_effective_pro_amount
              
          FROM complete_series
          ORDER BY utc_date;
    `, [stakingContractAddresses]);

    return {
      data: rawResult.rows
    }
  }

}

export default new StakingEventRepository()
