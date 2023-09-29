const _ = require('lodash');
const { ethers, Network } = require('ethers');
const tweet = require('./tweet');
const { OpenSeaStreamClient } = require('@opensea/stream-js');
const WebSocket = require('ws');
require('dotenv').config();


const X_API_KEY = process.env.X_API_KEY;
// console.log(process.env) //debug

// Initialize OpenSea Stream client
const client = new OpenSeaStreamClient({
  networkName: Network.MAINNET,
  token: X_API_KEY,
  connectOptions: {
    transport: WebSocket,
  },
});

// Start the WebSocket connection
client.connect();

// Handle connection errors
client.on('error', (error) => {
  console.error('OpenSea Stream error:', error);
});

// Subscribe to item sold events for multiple collections
const collectionSlugs = ['hood-morning-1', 'sunday-sauce', 'mgminft', 'da-burning-bush-1', 'renaissauce', 'digitaldisciples'];

collectionSlugs.forEach((collectionSlug) => {
  client.onItemSold(collectionSlug, (event) => {
    console.log(`Item sold event received for collection ${collectionSlug}`);
    console.log(event);

    // Handle the item sold event and post it
    formatAndSendTweet(event, collectionSlug);
  });
});

// Format post text
function formatAndSendTweet(event, collectionSlug) {
  // Handle both individual items + bundle sales
  const assetName = _.get(event, ['asset', 'name'], _.get(event, ['asset_bundle', 'name']));
  const openseaLink = encodeURIComponent(_.get(event, ['asset', 'permalink'], _.get(event, ['asset_bundle', 'permalink'])));

  const totalPrice = _.get(event, 'total_price');

  const tokenDecimals = _.get(event, ['payment_token', 'decimals']);
  const tokenUsdPrice = _.get(event, ['payment_token', 'usd_price']);
  const tokenEthPrice = _.get(event, ['payment_token', 'eth_price']);

  const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
  const formattedEthPrice = Number(formattedUnits) * tokenEthPrice;
  const formattedUsdPrice = Number(formattedUnits) * tokenUsdPrice;

  const tweetText = `${assetName} from ${collectionSlug} bought for ${formattedEthPrice}${ethers.constants.EtherSymbol} ($${formattedUsdPrice.toFixed(2)}) #NFT ${openseaLink}`;

  console.log(tweetText);

  const imageUrl = _.get(event, ['asset', 'image_url']);
  return tweet.tweetWithImage(tweetText, imageUrl);
}