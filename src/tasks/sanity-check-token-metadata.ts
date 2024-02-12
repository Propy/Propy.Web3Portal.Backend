import {
	NFTRepository,
  SystemReportRepository,
} from "../database/repositories";

import {
  INFTRecord,
} from "../interfaces"

function formatID(id: string, template: string) {
  return template.slice(0, -id.length) + id;
}

let propyCertificateContractAddresses = [
  "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95",
  "0x567c407D054A644DBBBf2d3a6643776473f82d7a",
  "0x73C3a1437B0307732Eb086cb2032552eBea15444"
];

const runMetadataCheck = async (nfts: INFTRecord[]) => {
  let misalignedNfts : INFTRecord[] = [];
  for(let nft of nfts) {
    let tokenId = nft.token_id;
    let metadata = nft.metadata;
    if(tokenId && metadata) {
      if(propyCertificateContractAddresses.indexOf(nft.asset_address) > -1) {
        let tokenName = metadata.name;
        let expectedName = formatID(tokenId, "Propy Certificate 000000");
        if(tokenName !== expectedName) {
          misalignedNfts.push(nft);
        }
      }
    }
  }
  return misalignedNfts;
}

export const sanityCheckTokenMetadata = async () => {
  let nftDataInitial = await NFTRepository.paginate(100, 1);
  let misalignedNfts = [];
  let resultsInitial = await runMetadataCheck(nftDataInitial.data);
  misalignedNfts = [...resultsInitial];
  for(let i = 2; i <= nftDataInitial.pagination.totalPages; i++) {
    let nftData = await NFTRepository.paginate(100, i);
    let resultsInLoop = await runMetadataCheck(nftData.data);
    if(resultsInLoop && resultsInLoop.length > 0) {
      misalignedNfts = [...misalignedNfts, ...resultsInLoop];
    }
  }
  let mainnetResults = misalignedNfts.filter((item) => item.network_name === "ethereum");
  let goerliDevResults = misalignedNfts.filter((item) => item.network_name === "goerli" && item.asset_address === "0x73C3a1437B0307732Eb086cb2032552eBea15444");
  let goerliStagingResults = misalignedNfts.filter((item) => item.network_name === "goerli" && item.asset_address === "0x8fbFe4036F13e8E42E51235C9adA6efD2ACF6A95");
  let reportData = {
    misaligned_nfts: misalignedNfts,
    misaligned_nfts_length: misalignedNfts.length,
    goerli_dev_results_length: goerliDevResults.length,
    goerli_staging_results_length: goerliStagingResults.length,
    mainnet_results_length: mainnetResults.length,
  }
  let currentReportRecord = await SystemReportRepository.findByColumn("name", "sanity-check-token-metadata-id-alignment");
  if(currentReportRecord) {
    await SystemReportRepository.update({data: JSON.stringify(reportData), last_report_timestamp: Math.floor(new Date().getTime() / 1000)}, currentReportRecord.id);
  } else {
    await SystemReportRepository.create({
      name: "sanity-check-token-metadata-id-alignment",
      data: JSON.stringify(reportData),
      last_report_timestamp: Math.floor(new Date().getTime() / 1000),
    });
  }
}