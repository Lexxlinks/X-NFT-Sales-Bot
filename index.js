const _ = require('lodash');
const { ethers } = require('ethers');
const tweet = require('./tweet');
require('dotenv').config();
const { OpenSeaStreamClient } = require('@opensea/stream-js');
const WebSocket = require('ws');

const X_API_KEY = process.env.X_API_KEY;
// console.log(process.env) //debug

// Initialize OpenSea Stream client
const client = new OpenSeaStreamClient({
  networkName: 'mainnet',
  apiKey: X_API_KEY,
  apiSecretKey: X_API_KEY,
  eventTypes: ['created', 'successful'],
  sharedSecret: 'YOUR_SHARED_SECRET',
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

// Subscribe to events
client.on('event', (event) => {
  console.log('Event received:', event);
});

// Subscribe to item sold events for your collection
const collectionSlug = 'mgminft'; // Replace with your collection's slug
const event = ['item_sold']; // Specify the event types you want to subscribe to

client.onItemSold(collectionSlug, (event) => {
  console.log('Item sold event received');
  console.log(event);

  // Handle the item sold event and post it
  formatAndSendTweet(event);
});

// Format post text
function formatAndSendTweet(event) {
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

  const tweetText = `${assetName} bought for ${formattedEthPrice}${ethers.constants.EtherSymbol} ($${formattedUsdPrice.toFixed(2)}) #NFT ${openseaLink}`;

  console.log(tweetText);

  const imageUrl = _.get(event, ['asset', 'image_url']);
  return tweet.tweetWithImage(tweetText, imageUrl);
}