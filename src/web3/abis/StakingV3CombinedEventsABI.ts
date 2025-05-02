import coreABI from './PRONFTStakingV3CoreABI.json'
import registryABI from './PRONFTStakingV3ABI.json'
import lpModuleABI from './LPStakingV3ModuleABI.json'
import keyModuleABI from './PropyKeyStakingV3ModuleABI.json'
import erc20ModuleABI from './ERC20StakingV3ModuleABI.json'

function getEventDefinitions(abi: any[]) {
  return abi.filter(item => item.type === 'event');
}

// Combine all event definitions
export const eventABI = [
  ...getEventDefinitions(coreABI),
  ...getEventDefinitions(lpModuleABI),
  ...getEventDefinitions(keyModuleABI),
  ...getEventDefinitions(erc20ModuleABI)
];

export const eventABIFull = [
  ...getEventDefinitions(registryABI),
  ...getEventDefinitions(coreABI),
  ...getEventDefinitions(lpModuleABI),
  ...getEventDefinitions(keyModuleABI),
  ...getEventDefinitions(erc20ModuleABI)
];

export default eventABIFull;