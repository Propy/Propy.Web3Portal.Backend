import BigNumber from 'bignumber.js';
import { utils } from "ethers";

import { runAccountFullNetworkSync } from './full-sync-account-network';

import {
  AccountRepository,
} from "../database/repositories";

import {
	IAddressToMultichainBaseBalance,
	ITokenAddressList,
	IAddressToNetworkToLatestBlock,
	IAddressToMultichainBalances,
} from '../interfaces';

BigNumber.config({ EXPONENTIAL_AT: [-1e+9, 1e+9] });

export const runAccountFullSync = async (
	address: string,
) => {

  let startTime = new Date().getTime();

  let account = await AccountRepository.getAccountByAddress(address);

  try {
    
    if(account.id) {
      console.log(`Syncing ${account.address} across all enabled networks`);

      let postgresTimestamp = Math.floor(new Date().setSeconds(0) / 1000);

      let addressToNetworkToLatestBlock : IAddressToNetworkToLatestBlock = {};
      let tokenAddressList: ITokenAddressList = {};
      let addressToMultichainBalances : IAddressToMultichainBalances = {};
      let addressToMultichainBaseBalance : IAddressToMultichainBaseBalance = {};

      let {
				address,
				ethereum_enabled,
				optimism_enabled,
				arbitrum_enabled,
				canto_enabled,
			} = account;

			address = utils.getAddress(address);

			let networks = [];

			if(ethereum_enabled) {
				networks.push("ethereum");
			}
			if(optimism_enabled) {
				networks.push("optimism");
			}
			if(arbitrum_enabled) {
				networks.push("arbitrum");
			}
			if(canto_enabled) {
				networks.push("canto");
			}

			await Promise.all(networks.map((network) => 
				runAccountFullNetworkSync(
					network,
					address,
					postgresTimestamp,
					tokenAddressList,
					addressToMultichainBalances,
					addressToNetworkToLatestBlock,
					addressToMultichainBaseBalance
				)
			))

      console.log(`Full sync of ${account.address} successful, exec time: ${new Date().getTime() - startTime}ms, finished at ${new Date().toISOString()}`)

    } else {
      console.log(`Unable to sync ${account.address} as it is not an activated account`);
    }

  } catch(e) {
    console.error(`Unable to complete sync of ${account.address}, error: ${e}`);
  }
  
}