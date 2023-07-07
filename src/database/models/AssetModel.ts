import { ASSET_TABLE, BALANCE_TABLE, ERC721_TRANSFER_EVENT_TABLE, ERC20_TRANSFER_EVENT_TABLE } from "../tables";
import BaseModel from "./BaseModel";
import BalanceModel from "./BalanceModel";
import TokenTransferEventERC721Model from "./TokenTransferEventERC721Model";
import TokenTransferEventERC20Model from "./TokenTransferEventERC20Model";

export default class AssetModel extends BaseModel {
    static get tableName() {
        return ASSET_TABLE
    }

    static get idColumn() {
        return "id"
    }

    static get relationMappings() {
        return {
            balance: {
                relation: BaseModel.HasManyRelation,
                modelClass: BalanceModel,
                join: {
                    from: `${ASSET_TABLE}.address`,
                    to: `${BALANCE_TABLE}.asset_address`,
                }
            },
            transfer_events_erc721: {
                relation: BaseModel.HasManyRelation,
                modelClass: TokenTransferEventERC721Model,
                join: {
                    from: `${ASSET_TABLE}.address`,
                    to: `${ERC721_TRANSFER_EVENT_TABLE}.contract_address`,
                }
            },
            transfer_events_erc20: {
                relation: BaseModel.HasManyRelation,
                modelClass: TokenTransferEventERC20Model,
                join: {
                    from: `${ASSET_TABLE}.address`,
                    to: `${ERC20_TRANSFER_EVENT_TABLE}.contract_address`,
                }
            }
        }
    }
}