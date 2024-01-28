const _ = require('lodash');
const { ethers, Network } = require('ethers');
const tweet = require('./tweet');
const { OpenSeaStreamClient } = require('@opensea/stream-js');
const WebSocket = require('ws');
require('dotenv').config();

async function main() {
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

    console.log('OpenSea Stream connected');

  // Subscribe to item sold events for multiple collections
    const collectionSlugs = ['hood-morning-1', 'sunday-sauce', 'mgminft', 'da-burning-bush-1', 'renaissauce', 'digitaldisciples', 'clonex'];

    collectionSlugs.forEach((collectionSlug) => {
      console.log('Joining channel for collection: ${collectionSlug}');
    client.onItemSold(collectionSlug, (event) => {
      try {
      console.log(`Item sold event received for collection ${collectionSlug}`);
      console.log(event);
      } catch (error) {
        console.error('Error processing event:', error);
      }

  // Check that payment token exists and contains decimals field
    const paymentToken = event.payload.payment_token;
    if (!paymentToken || !paymentToken.decimals) {
      console.error('Payment token is null or undefined.');
      return;
    }

  // Get the token decimals
    const tokenDecimals = paymentToken.decimals ?? 18;

  // Use the extracted function to format prices
    const { formattedTotalPrice, formattedEthPrice, formattedUsdPrice } = formatPrices(
    _.get(event, ['payload', 'sale_price']),
    tokenDecimals,
    paymentToken.eth_price,
    paymentToken.usd_price
  );

  // Log the formatted prices to the console
    console.log('tokenDecimals:', tokenDecimals);
    console.log('formattedTotalPrice:', formattedTotalPrice);
    console.log('formattedEthPrice:', formattedEthPrice);
    console.log('formattedUsdPrice:', formattedUsdPrice);

  // Handle the item sold event and post it
    formatAndSendTweet(event, collectionSlug, formattedEthPrice, formattedUsdPrice);
    });
  });

  // Format post text
    async function formatAndSendTweet(ethers, event, collectionSlug, formattedEthPrice, formattedUsdPrice) {
    console.log('formatAndSendTweet called'); //Log entire event
  // Handle both individual items + bundle sales
    const assetName = _.get(event, ['asset', 'name'], _.get(event, ['asset_bundle', 'name']));
    const openseaLink = encodeURIComponent(_.get(event, ['asset', 'permalink'], _.get(event, ['asset_bundle', 'permalink'])));
    
  // Create the tweet text
    let tweetText;
    if (ethers && ethers.constants) {
        tweetText = `${assetName} from ${collectionSlug} bought for ${formattedEthPrice}${ethers.constants.EtherSymbol} ($${formattedUsdPrice.toFixed(2)}) #NFT ${openseaLink}`;
    } else {
        console.error('ethers or ethers.constants is undefined');
        // Default tweetText
        tweetText = '${assetName} from ${collectionSlug} bought for ${formattedEthPrice} ETH ($${formattedUsdPrice.toFixed(2)}) #NFT ${openseaLink}';
    }    

  // Get the image URL
    const imageUrl = _.get(event, ['asset', 'image_url']);

  // Send the tweet
    try {
    await tweet.tweetWithImage(tweetText, imageUrl);
      } catch (error) {
    console.error('Error sending tweet:',error);
    }
  }

  // Extracted function to format prices
    function formatPrices(totalPrice, decimals, eth_price, usd_price) {
    const totalPriceBigInt = BigInt(totalPrice);

  // Use BigInt arithmetic to format the total price
    const formattedTotalPrice = (totalPriceBigInt / BigInt(10) ** BigInt(decimals)).toString();

    const tokenEthPrice = Number(eth_price);
    const tokenUsdPrice = Number(usd_price);

    const formattedEthPrice = Number(formattedTotalPrice) * tokenEthPrice;
    const formattedUsdPrice = Number(formattedTotalPrice) * tokenUsdPrice;

    return { formattedTotalPrice, formattedEthPrice, formattedUsdPrice };
  }
}

main();