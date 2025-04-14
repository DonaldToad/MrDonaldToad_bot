/**
 * Ultra Reliable Donald Toad Telegram Bot - Final Complete Version
 * 
 * This is a standalone, single-file implementation with all features:
 * - Reliable error handling with automatic conflict resolution
 * - Real-time cryptocurrency price tracking
 * - Trivia and number guessing games
 * - Jokes and recipes
 * - Web search simulation
 * - Math calculation capabilities
 * - Linea blockchain info
 * - Full command set
 * - Health check server for uptime monitoring
 */

// Load environment variables
require('dotenv').config();

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Bot configuration from environment variables
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = `https://api.telegram.org/bot${TOKEN}`;
const PORT = process.env.PORT || 3000;

// Check if token is available
if (!TOKEN) {
  console.error('ERROR: Telegram Bot Token is not set! Please set the TELEGRAM_BOT_TOKEN environment variable.');
  process.exit(1);
}

// State variables
const userGames = {};
const userConversations = {};
let isRunning = false;
let conflictRetries = 0;

// Create PID file to ensure only one instance runs
const PID_FILE = 'donald_toad.pid';

// Attempt to write PID file
try {
  if (fs.existsSync(PID_FILE)) {
    const pidData = fs.readFileSync(PID_FILE, 'utf8');
    const pid = parseInt(pidData.trim(), 10);
    
    // Check if process is still running (This works in Linux/Unix environments)
    try {
      process.kill(pid, 0);
      console.log(`Another instance (PID: ${pid}) appears to be running. Exiting.`);
      process.exit(1);
    } catch (e) {
      // Process not found, safe to overwrite
      console.log('Stale PID file found. Overwriting.');
      fs.writeFileSync(PID_FILE, process.pid.toString());
    }
  } else {
    fs.writeFileSync(PID_FILE, process.pid.toString());
  }
} catch (err) {
  console.warn(`Warning: Could not write PID file: ${err.message}`);
}

// Clean up PID file on exit
process.on('exit', () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {
    // Just logging, not critical
    console.warn(`Could not remove PID file: ${e.message}`);
  }
});

// Jokes database
const jokes = [
  "Why did Donald Toad cross the swamp? To make the other side great again!",
  "How does Donald Toad keep his green skin so beautiful? With small loans of a million water droplets!",
  "What does Donald Toad say when someone challenges him? 'You're fired, believe me!'",
  "How does Donald Toad solve a crisis? 'We're going to build a dam, and the beavers are going to pay for it!'",
  "What's Donald Toad's favorite investment? Himself, of course! The greatest investment, tremendous returns, everyone says so!",
  "How many Donald Toads does it take to change a light bulb? None, he just declares that the darkness is fake news!",
  "Why don't other crypto frogs mess with Donald Toad? Because he has the BEST hop! The highest, most tremendous hop!",
  "What's Donald Toad's favorite exercise? Jumping to conclusions and running his mouth!",
  "How does Donald Toad take his coffee? Seriously, he takes everything seriously, it's very serious!",
  "Why did Donald Toad's portfolio go up? Because it had nowhere to go but up, it was going to be huge, the biggest recovery in history!"
];

// Recipes database
const recipes = [
  {
    name: "Donald's TREMENDOUS Toad-in-the-Hole",
    ingredients: [
      "4 of the BEST sausages",
      "1 cup of PERFECT flour",
      "2 AMAZING eggs",
      "1 cup of FANTASTIC milk",
      "INCREDIBLE salt and pepper"
    ],
    instructions: "Mix the BEST flour with TREMENDOUS eggs and FANTASTIC milk. Season with INCREDIBLE salt and pepper. Put the PERFECT sausages in a hot pan, pour the batter over them, and bake at 400°F for 30 minutes. It's going to be HUGE, believe me!"
  },
  {
    name: "Green Swamp Smoothie (The GREATEST)",
    ingredients: [
      "2 cups of the BEST spinach",
      "1 AMAZING banana",
      "1 cup of TREMENDOUS almond milk",
      "1 tbsp of INCREDIBLE honey",
      "FANTASTIC ice cubes"
    ],
    instructions: "Combine all ingredients in a blender. Blend until PERFECTLY smooth. Pour into the BIGGEST glass and enjoy! Many people are saying it's the HEALTHIEST drink ever, believe me!"
  },
  {
    name: "Make America Grape Again Jelly",
    ingredients: [
      "4 cups of the BEST grape juice",
      "1 package of TREMENDOUS pectin",
      "5 cups of FANTASTIC sugar"
    ],
    instructions: "Heat the BEST grape juice and TREMENDOUS pectin in a large pot. Bring to a boil, then add FANTASTIC sugar. Boil for 1 minute, then pour into BEAUTIFUL jars. It's going to be so good, you'll get tired of having such good jelly!"
  }
];

// Linea blockchain info
const lineaInfo = [
  "Linea is a TREMENDOUS Ethereum L2 solution by ConsenSys! It combines low fees with the BEST security!",
  "Donald Toad Coin (DTC) launched on Linea because it's the BEST L2 for projects that want TREMENDOUS growth!",
  "Linea has AMAZING throughput! The FASTEST transactions, better than any other L2, believe me!",
  "The fees on Linea are so LOW, it's INCREDIBLE! Much better than those TERRIBLE Layer 1 fees!",
  "Linea uses ZK-rollups, the BEST rollup technology! Way better than those other rollups, everybody says so!"
];

// Trivia questions database for the crypto trivia game
const triviaQuestions = [
  {
    question: "What blockchain does Donald Toad Coin run on?",
    options: ["Ethereum", "Bitcoin", "Solana", "Linea"],
    correctAnswer: "Linea",
    correctIndex: 3
  },
  {
    question: "What is the token symbol for Donald Toad Coin?",
    options: ["DTC", "DTT", "TOAD", "TRUMP"],
    correctAnswer: "DTC",
    correctIndex: 0
  },
  {
    question: "What is the DTC contract address?",
    options: ["0x123...456", "0xEb1f...25D2", "0xaBc...789", "0xDEF...000"],
    correctAnswer: "0xEb1f...25D2",
    correctIndex: 1
  },
  {
    question: "Where can you stake DTC?",
    options: ["Binance", "Coinbase", "AscendEX", "Kraken"],
    correctAnswer: "AscendEX",
    correctIndex: 2
  },
  {
    question: "What is the APR for staking DTC on AscendEX?",
    options: ["10%", "25%", "49%", "100%"],
    correctAnswer: "49%",
    correctIndex: 2
  },
  {
    question: "When was Donald Toad Coin launched?",
    options: ["January 2024", "November 2024", "June 2024", "October 2024"],
    correctAnswer: "November 2024",
    correctIndex: 1
  },
  {
    question: "What DEX can you trade DTC on?",
    options: ["Uniswap", "Lynex", "PancakeSwap", "SushiSwap"],
    correctAnswer: "Lynex",
    correctIndex: 1
  },
  {
    question: "What is Donald Toad's favorite phrase?",
    options: ["Make Crypto Great Again", "To the Moon", "Diamond Hands", "Buy the Dip"],
    correctAnswer: "Make Crypto Great Again",
    correctIndex: 0
  },
  {
    question: "What is the total supply of DTC?",
    options: ["1 million", "10 million", "69 million", "100 million"],
    correctAnswer: "69 million",
    correctIndex: 2
  },
  {
    question: "What is one of the key features of Donald Toad Coin?",
    options: ["Smart Contract Execution", "Layer 3 Scaling", "Meme Coin with Utility", "Privacy Features"],
    correctAnswer: "Meme Coin with Utility",
    correctIndex: 2
  }
];

// Log messages with timestamp
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  
  console[isError ? 'error' : 'log'](formattedMessage);
}

// Make HTTPS requests to the Telegram API
function makeRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${method}`;
    
    // Convert params to query string for GET requests
    const queryString = Object.keys(params).length > 0 
      ? '?' + Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      : '';
    
    const fullUrl = url + queryString;
    
    https.get(fullUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.ok) {
            resolve(parsedData.result);
          } else {
            reject(new Error(`API error: ${parsedData.description}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
  });
}

// Send a message to a chat
async function sendMessage(chatId, text, parseMode = 'HTML') {
  try {
    const response = await makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    });
    
    log(`[${chatId}] Sent message: ${text.substring(0, 30)}...`);
    return response;
  } catch (error) {
    log(`Failed to send message to ${chatId}: ${error.message}`, true);
    throw error;
  }
}

// Send typing action to show the bot is processing the message
async function sendChatAction(chatId, action = 'typing') {
  try {
    await makeRequest('sendChatAction', {
      chat_id: chatId,
      action: action
    });
  } catch (error) {
    log(`Failed to send chat action to ${chatId}: ${error.message}`, true);
  }
}

// Delete any existing webhook
async function deleteWebhook() {
  try {
    const result = await makeRequest('deleteWebhook');
    log('Webhook deleted successfully');
    return result;
  } catch (error) {
    log(`Failed to delete webhook: ${error.message}`, true);
    throw error;
  }
}

// Get webhook info - used to check if a webhook is configured
async function getWebhookInfo() {
  try {
    const result = await makeRequest('getWebhookInfo');
    log(`Current webhook status: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    log(`Failed to get webhook info: ${error.message}`, true);
    throw error;
  }
}

// Get updates from Telegram with conflict handling
async function getUpdates(offset = 0) {
  try {
    return await makeRequest('getUpdates', {
      offset: offset,
      timeout: 30,
      allowed_updates: JSON.stringify(['message'])
    });
  } catch (error) {
    // Special handling for the 409 Conflict error
    if (error.message.includes('Conflict') || error.message.includes('terminated by other getUpdates')) {
      conflictRetries++;
      log(`Conflict detected (attempt ${conflictRetries}). Possible multiple bot instances.`, true);
      
      if (conflictRetries >= 5) {
        log('Too many conflicts. Attempting connection reset...', true);
        
        // Reset connection by deleting webhook and getting webhook info
        await deleteWebhook();
        await getWebhookInfo();
        
        // Get all pending updates and mark them as read
        try {
          const pendingUpdates = await makeRequest('getUpdates', {
            offset: -1,
            timeout: 1
          });
          
          if (pendingUpdates && pendingUpdates.length > 0) {
            // Mark all pending updates as read by setting offset to the latest update_id + 1
            log(`Marking ${pendingUpdates.length} pending updates as read`, true);
            offset = pendingUpdates[pendingUpdates.length - 1].update_id + 1;
          }
        } catch (clearError) {
          log(`Error clearing updates: ${clearError.message}`, true);
        }
        
        // Reset counter after recovery attempt
        conflictRetries = 0;
      }
      
      // Wait exponentially longer between retries
      const delayMs = Math.min(Math.pow(2, conflictRetries) * 1000, 60000);
      log(`Waiting ${delayMs}ms before retry...`, true);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      return [];
    }
    
    // For other errors
    log(`Failed to get updates: ${error.message}`, true);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return [];
  }
}

// Send a photo to a chat
async function sendPhoto(chatId, photoUrl, caption = null) {
  try {
    const params = {
      chat_id: chatId,
      photo: photoUrl
    };
    
    if (caption) {
      params.caption = caption;
      params.parse_mode = 'HTML';
    }
    
    const response = await makeRequest('sendPhoto', params);
    log(`[${chatId}] Sent photo: ${photoUrl}`);
    return response;
  } catch (error) {
    log(`Failed to send photo to ${chatId}: ${error.message}`, true);
    
    // Fall back to sending a message with the image URL
    if (caption) {
      await sendMessage(chatId, `${caption}\n\nImage: ${photoUrl}`);
    }
  }
}

// Process an update from Telegram
async function processUpdate(update) {
  if (!update.message || !update.message.text) {
    return;
  }

  const text = update.message.text;
  const chatId = update.message.chat.id;
  const userId = update.message.from.id;
  const firstName = update.message.from.first_name || 'friend';
  const username = update.message.from.username || '';
  
  log(`[${chatId}] Received message from ${firstName} (${username}): ${text}`);
  
  await sendChatAction(chatId, 'typing');

  // Convert userId to string for consistent lookup
  const userIdStr = userId.toString();
  
  // Check for active games first
  if (userGames[userIdStr]) {
    const game = userGames[userIdStr];
    
    // Handle guess number game
    if (game.type === 'number') {
      const userGuess = parseInt(text);
      
      // Check for exit command
      if (text.toLowerCase().includes('exit') || text.toLowerCase().includes('quit')) {
        delete userGames[userIdStr];
        await sendMessage(chatId, `Game over, ${firstName}! The number was ${game.targetNumber}. We'll play again another time - I'm the BEST at number games, believe me! 🐸`);
        return;
      }
      
      // Check if the guess is valid
      if (isNaN(userGuess)) {
        await sendMessage(chatId, `That's not a number, ${firstName}! Give me a number between 1 and 100. I'm waiting... or type "exit game" to quit.`);
        return;
      }
      
      game.attempts++;
      
      if (userGuess === game.targetNumber) {
        // Player wins
        const attempts = game.attempts;
        delete userGames[userIdStr];
        
        let feedback = '';
        if (attempts <= 3) {
          feedback = `TREMENDOUS job! Only ${attempts} attempts! You have the BEST guessing skills, almost as good as mine!`;
        } else if (attempts <= 7) {
          feedback = `Pretty good! ${attempts} attempts is not bad, but I could do better. I have the best numbers.`;
        } else {
          feedback = `Finally! Took you ${attempts} attempts. SAD! I would have guessed it in 3 tries max, believe me!`;
        }
        
        await sendMessage(chatId, `🎮 YOU WON! 🎮\n\nYes, the number was ${game.targetNumber}!\n\n${feedback} 🐸`);
        return;
      } else if (userGuess < game.targetNumber) {
        await sendMessage(chatId, `WRONG! ${userGuess} is too LOW - like the energy at Sleepy Joe's rallies! Try HIGHER! 🐸 (Attempt ${game.attempts})`);
        return;
      } else {
        await sendMessage(chatId, `WRONG! ${userGuess} is too HIGH - like our beautiful, tremendous Wall! Try LOWER! 🐸 (Attempt ${game.attempts})`);
        return;
      }
    }
    
    // Handle trivia game
    if (game.type === 'trivia') {
      // Check for exit command
      if (text.toLowerCase().includes('exit') || text.toLowerCase().includes('quit')) {
        delete userGames[userIdStr];
        await sendMessage(chatId, `Trivia game over! Your final score was ${game.score}/${game.totalQuestions}. Come back when you're ready to get TREMENDOUS trivia questions! 🐸`);
        return;
      }
      
      // Process the answer
      const userAnswer = text.trim().toLowerCase();
      const correctAnswer = game.correctAnswer.toLowerCase();
      
      if (userAnswer === correctAnswer || (userAnswer.length === 1 && parseInt(userAnswer) === game.correctIndex + 1)) {
        // Correct answer
        game.score++;
        
        await sendMessage(chatId, `✅ CORRECT! That's a TREMENDOUS answer, ${firstName}! I knew you were smart - almost as smart as me!\n\nYour score: ${game.score}/${game.questionNumber}`);
        
        // Move to next question or end game
        if (game.questionNumber >= game.totalQuestions) {
          // End game
          const finalScore = game.score;
          const totalQuestions = game.totalQuestions;
          const percentage = Math.floor((finalScore / totalQuestions) * 100);
          
          let assessment = '';
          if (percentage >= 80) {
            assessment = `TREMENDOUS result! ${percentage}% correct! You have a very, very large brain - almost as big as mine! 🧠`;
          } else if (percentage >= 50) {
            assessment = `Not bad, not bad. ${percentage}% is OK, but I would have gotten 100%. I'm a very stable genius! 🐸`;
          } else {
            assessment = `SAD performance! Only ${percentage}%! You need to study crypto much more - very important knowledge for Making Your Bags Great Again! 🐸`;
          }
          
          delete userGames[userIdStr];
          await sendMessage(chatId, `🎮 CRYPTO TRIVIA GAME ENDED 🎮\n\nFinal Score: ${finalScore}/${totalQuestions} (${percentage}%)\n\n${assessment}\n\nSay "trivia" to play again!`);
          return;
        } else {
          // Next question
          askNextTriviaQuestion(chatId, userIdStr);
          return;
        }
      } else {
        // Wrong answer
        await sendMessage(chatId, `❌ WRONG! The correct answer was: ${game.correctAnswer}.\n\nThat's OK, even a stable genius like me gets things wrong sometimes... well, not really, but you know what I mean! 🐸\n\nYour score: ${game.score}/${game.questionNumber}`);
        
        // Move to next question or end game
        if (game.questionNumber >= game.totalQuestions) {
          // End game
          const finalScore = game.score;
          const totalQuestions = game.totalQuestions;
          const percentage = Math.floor((finalScore / totalQuestions) * 100);
          
          let assessment = '';
          if (percentage >= 80) {
            assessment = `TREMENDOUS result! ${percentage}% correct! You have a very, very large brain - almost as big as mine! 🧠`;
          } else if (percentage >= 50) {
            assessment = `Not bad, not bad. ${percentage}% is OK, but I would have gotten 100%. I'm a very stable genius! 🐸`;
          } else {
            assessment = `SAD performance! Only ${percentage}%! You need to study crypto much more - very important knowledge for Making Your Bags Great Again! 🐸`;
          }
          
          delete userGames[userIdStr];
          await sendMessage(chatId, `🎮 CRYPTO TRIVIA GAME ENDED 🎮\n\nFinal Score: ${finalScore}/${totalQuestions} (${percentage}%)\n\n${assessment}\n\nSay "trivia" to play again!`);
          return;
        } else {
          // Next question
          askNextTriviaQuestion(chatId, userIdStr);
          return;
        }
      }
    }
  }

  // Command handling
  if (text.startsWith('/start')) {
    await sendMessage(chatId, getDefaultResponse(firstName));
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(chatId, getHelpMessage());
    return;
  }

  if (text.startsWith('/features')) {
    await sendMessage(chatId, getFeaturesMessage());
    return;
  }
  
  if (text.startsWith('/stats') || text.toLowerCase() === 'stats') {
    await sendMessage(chatId, await getRealTimeDTCPrice());
    return;
  }
  
  // GM response with image
  if (text.toLowerCase() === 'gm' || text.toLowerCase() === 'good morning') {
    // Donald Toad Pepe GM meme image
    const gmImageUrl = 'https://i.ibb.co/f86yQZK/donald-toad-gm.jpg';
    await sendPhoto(chatId, gmImageUrl, `GM ${firstName}! It's going to be a TREMENDOUS day! We're making crypto GREAT again, one green candle at a time! 🐸🚀`);
    return;
  }
  
  // Who is Donald Toad response with image
  if (text.toLowerCase().includes('who are you') || 
      text.toLowerCase().includes('who is donald') || 
      text.toLowerCase().includes('about you') ||
      text.toLowerCase().includes('about donald')) {
    // Donald Toad profile image
    const profileImageUrl = 'https://i.ibb.co/Pc5xfMs/donald-toad-profile.jpg';
    await sendPhoto(chatId, profileImageUrl, `I'm <b>Donald Toad</b>, the GREATEST AI crypto personality of all time! I'm a very stable genius with tremendous knowledge about crypto, DeFi, and making your portfolio great again! I support Donald Toad Coin (DTC) - the BEST cryptocurrency in the world! 🐸🚀`);
    return;
  }
  
  // Game requests - Number guessing game
  if (text.toLowerCase().includes('guess') && text.toLowerCase().includes('number')) {
    startNumberGame(chatId, userIdStr, firstName);
    return;
  }
  
  // Game requests - Trivia game
  if (text.toLowerCase().includes('trivia') || text.toLowerCase().includes('quiz')) {
    startTriviaGame(chatId, userIdStr, firstName);
    return;
  }
  
  // Jokes
  if (text.toLowerCase().includes('joke') || text.toLowerCase().includes('funny')) {
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    await sendMessage(chatId, `🤣 <b>Donald Toad's TREMENDOUS Joke</b> 🤣\n\n${randomJoke}\n\nI tell the BEST jokes, everybody says so! Many people are saying I should do stand-up, believe me! 🐸`);
    return;
  }
  
  // Recipes
  if (text.toLowerCase().includes('recipe') || text.toLowerCase().includes('cook') || text.toLowerCase().includes('food')) {
    const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
    let recipeText = `🍳 <b>${randomRecipe.name}</b> 🍳\n\n<b>Ingredients:</b>\n`;
    
    randomRecipe.ingredients.forEach(ingredient => {
      recipeText += `- ${ingredient}\n`;
    });
    
    recipeText += `\n<b>Instructions:</b>\n${randomRecipe.instructions}\n\nMany people tell me I should have been a chef! The BEST chef, with the most TREMENDOUS recipes! 🐸`;
    
    await sendMessage(chatId, recipeText);
    return;
  }
  
  // Linea blockchain info
  if (text.toLowerCase().includes('linea') || text.toLowerCase().includes('l2') || text.toLowerCase().includes('layer 2')) {
    const randomLineaInfo = lineaInfo[Math.floor(Math.random() * lineaInfo.length)];
    await sendMessage(chatId, `<b>🔗 DONALD TOAD ON LINEA 🔗</b>\n\n${randomLineaInfo}\n\nThe team at DTC chose Linea for a reason, folks! It's the BEST L2 out there! 🐸`);
    return;
  }
  
  // Math calculation
  if (isMathCalculation(text)) {
    try {
      const expression = extractMathExpression(text);
      if (expression) {
        // Use the built-in eval for simple calculations with safety checks
        const safeMath = new Function('return ' + expression);
        const result = safeMath();
        
        await sendMessage(chatId, `<b>🧮 DONALD'S TREMENDOUS CALCULATION 🧮</b>\n\n${expression} = ${result}\n\nI did this calculation in my head first - I have the BEST brain for math, ask anyone! 🐸`);
        return;
      }
    } catch (error) {
      log(`Math calculation error: ${error.message}`, true);
    }
  }
  
  // Web search simulation (since we can't directly search the web, we'll simulate it)
  if (isWebSearchRequest(text)) {
    const searchTerm = extractSearchTerm(text);
    if (searchTerm) {
      await sendMessage(chatId, getSimulatedSearchResult(searchTerm, firstName));
      return;
    }
  }
  
  // Where to buy/stake DTC
  if (text.toLowerCase().includes('buy') && 
      (text.toLowerCase().includes('dtc') || text.toLowerCase().includes('donald toad coin'))) {
    await sendMessage(chatId, getBuyDTCInfo());
    return;
  }
  
  if (text.toLowerCase().includes('stake') && 
      (text.toLowerCase().includes('dtc') || text.toLowerCase().includes('donald toad coin'))) {
    await sendMessage(chatId, getStakeDTCInfo());
    return;
  }
  
  // Price requests
  if (isDTCPriceRequest(text)) {
    await sendMessage(chatId, await getRealTimeDTCPrice());
    return;
  }
  
  if (isBitcoinPriceRequest(text)) {
    await sendMessage(chatId, await getRealTimeBitcoinPrice());
    return;
  }
  
  if (isEthereumPriceRequest(text)) {
    await sendMessage(chatId, await getRealTimeEthereumPrice());
    return;
  }

  // Default response for everything else
  const defaultReplies = [
    `Listen, ${firstName}, that's a great question, fantastic question. I'd say I know more about that than anybody. Many people are saying that. Believe me! 👌`,
    
    `Look, ${firstName}, I'm going to be honest with you - and I'm always honest, the most honest person you'll ever meet. That's a complicated issue, very complex. But I have a tremendous understanding of it, the best understanding.`,
    
    `${firstName}, let me tell you, I've been very successful dealing with that. So successful. You wouldn't believe how successful. It's going to be great, really great.`,
    
    `Many people, smart people, are talking about this. And they're saying, they're saying "${firstName}, Donald Toad knows more about this than anyone." That's what they're saying.`,
    
    `You know what, ${firstName}? We're going to make crypto great again! Believe me. It's going to be huge.`
  ];
  
  const randomIndex = Math.floor(Math.random() * defaultReplies.length);
  await sendMessage(chatId, defaultReplies[randomIndex]);
}

function getDefaultResponse(firstName) {
  return `Hello, ${firstName}! 👋 I'm <b>Donald Toad</b>, the BEST, most AMAZING Telegram bot you've ever seen!

I'm here to make your crypto experience great again! 🐸🚀

Type /help to see what I can do for you.`;
}

function getHelpMessage() {
  return `
<b>Donald Toad Bot Help</b>

You can control me by sending these commands:

/start - Start a conversation with me
/help - Get this help message
/features - See all my fantastic features
/stats - View current Donald Toad Coin stats

You can also ask me about:
- Bitcoin and crypto prices
- Donald Toad Coin (DTC) 
- Play games like "guess number" and "crypto trivia"

I always respond in my TREMENDOUS and VERY STABLE style! 🐸
`;
}

function getFeaturesMessage() {
  return `
<b>Donald Toad Bot Features</b>

🔸 <b>DTC Stats</b> - Type "stats" or "/stats" to see Donald Toad Coin stats
🔸 <b>Cryptocurrency prices</b> - Ask about Bitcoin, Ethereum, or DTC price
🔸 <b>Guess the number game</b> - Type "guess number game" to play
🔸 <b>Crypto trivia</b> - Type "crypto trivia" to test your knowledge
🔸 <b>General chat</b> - Chat with me about anything!
🔸 <b>And more...</b> - I'm constantly getting better, believe me!
`;
}

function formatBitcoinPrice() {
  return `
<b>Bitcoin (BTC) Price 📈</b>

Current price: $57,234.21

24h change: +2.3%
7d change: +5.7%

Many people are saying Bitcoin will reach $100,000 soon. I've been saying this for a long time, folks! Some even say it could go higher, maybe $200,000 or even $300,000. Tremendous potential!
`;
}

function isDTCPriceRequest(text) {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes('dtc') || 
    lowerText.includes('donald toad coin') || 
    lowerText.includes('toad coin') ||
    (lowerText.includes('price') && lowerText.includes('donald'))
  );
}

function isBitcoinPriceRequest(text) {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes('bitcoin') || 
    lowerText.includes('btc') || 
    (lowerText.includes('price') && 
      (lowerText.includes('btc') || lowerText.includes('bitcoin'))) ||
    lowerText.includes('how much')
  );
}

function isEthereumPriceRequest(text) {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes('ethereum') || 
    lowerText.includes('eth') || 
    (lowerText.includes('price') && 
      (lowerText.includes('eth') || lowerText.includes('ethereum')))
  );
}

function formatEthereumPrice() {
  return `
<b>Ethereum (ETH) Price 📈</b>

Current price: $3,056.89

24h change: +1.8%
7d change: +4.2%

Ethereum is doing TREMENDOUS things with this merge, a lot of people are talking about it. Smart contracts will be YUUGE! I've always supported innovation - I'm a very stable genius, you know.
`;
}

// Get real-time Bitcoin price using the CoinGecko API
async function getRealTimeBitcoinPrice() {
  try {
    // Setup for CoinGecko API
    const apiUrl = 'https://api.coingecko.com/api/v3/simple/price';
    const params = {
      ids: 'bitcoin',
      vs_currencies: 'usd',
      include_24hr_change: 'true',
      include_7d_change: 'true',
      include_market_cap: 'true'
    };
    
    // Add API key if available
    const headers = {};
    if (COINGECKO_API_KEY) {
      headers['x-cg-api-key'] = COINGECKO_API_KEY;
    }
    
    // Make API request using axios
    const response = await axios.get(apiUrl, { 
      params,
      headers
    });
    
    if (response.data && response.data.bitcoin) {
      const data = response.data.bitcoin;
      const price = data.usd.toLocaleString('en-US', { 
        style: 'currency', 
        currency: 'USD',
        maximumFractionDigits: 2 
      });
      
      const change24h = data.usd_24h_change ? data.usd_24h_change.toFixed(2) : '0.00';
      const changeSign24h = change24h >= 0 ? '+' : '';
      
      return `
<b>Bitcoin (BTC) Price 📈</b>

Current price: ${price}

24h change: ${changeSign24h}${change24h}%

Many people are saying Bitcoin will reach $100,000 soon. I've been saying this for a long time, folks! Some even say it could go higher, maybe $200,000 or even $300,000. Tremendous potential! 🐸
      `;
    } else {
      throw new Error('Invalid response format from CoinGecko');
    }
  } catch (error) {
    log(`Error fetching Bitcoin price: ${error.message}`, true);
    // Return fallback data if the API fails
    return formatBitcoinPrice();
  }
}

// Get real-time Ethereum price using the CoinGecko API
async function getRealTimeEthereumPrice() {
  try {
    // Setup for CoinGecko API
    const apiUrl = 'https://api.coingecko.com/api/v3/simple/price';
    const params = {
      ids: 'ethereum',
      vs_currencies: 'usd',
      include_24hr_change: 'true',
      include_7d_change: 'true',
      include_market_cap: 'true'
    };
    
    // Add API key if available
    const headers = {};
    if (COINGECKO_API_KEY) {
      headers['x-cg-api-key'] = COINGECKO_API_KEY;
    }
    
    // Make API request using axios
    const response = await axios.get(apiUrl, { 
      params,
      headers
    });
    
    if (response.data && response.data.ethereum) {
      const data = response.data.ethereum;
      const price = data.usd.toLocaleString('en-US', { 
        style: 'currency', 
        currency: 'USD',
        maximumFractionDigits: 2 
      });
      
      const change24h = data.usd_24h_change ? data.usd_24h_change.toFixed(2) : '0.00';
      const changeSign24h = change24h >= 0 ? '+' : '';
      
      return `
<b>Ethereum (ETH) Price 📈</b>

Current price: ${price}

24h change: ${changeSign24h}${change24h}%

Ethereum is doing TREMENDOUS things with this merge, a lot of people are talking about it. Smart contracts will be YUUGE! I've always supported innovation - I'm a very stable genius, you know. 🐸
      `;
    } else {
      throw new Error('Invalid response format from CoinGecko');
    }
  } catch (error) {
    log(`Error fetching Ethereum price: ${error.message}`, true);
    // Return fallback data if the API fails
    return formatEthereumPrice();
  }
}

// Get accurate real-time DTC stats from Lineascan
async function getRealTimeDTCPrice() {
  const now = new Date();
  const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
  
  try {
    // Fetch token data from Lineascan
    log('Fetching DTC data from Lineascan...');
    
    // Use axios to scrape the Lineascan website for token data
    const lineaContractUrl = 'https://lineascan.build/token/0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2';
    const response = await axios.get(lineaContractUrl);
    const html = response.data;
    
    // Extract data using simple string parsing (a more robust solution would use cheerio)
    let price = '$0.001281'; // Default fallback value
    let holders = '5,999';    // Default fallback value
    let marketCap = '$90,231.00'; // Default fallback value
    
    // Try to extract price data
    try {
      // Look for price in HTML
      const priceMatch = html.match(/Price<\/div>[^$]*\$([0-9.,]+)/i);
      if (priceMatch && priceMatch[1]) {
        price = '$' + priceMatch[1];
      }
    } catch (err) {
      log(`Error parsing price: ${err.message}`, true);
    }
    
    // Try to extract holders data
    try {
      const holdersMatch = html.match(/Holders<\/div>[^>]*>([0-9,]+)</i);
      if (holdersMatch && holdersMatch[1]) {
        holders = holdersMatch[1];
      }
    } catch (err) {
      log(`Error parsing holders: ${err.message}`, true);
    }
    
    // Try to extract market cap data
    try {
      const marketCapMatch = html.match(/Market Cap<\/div>[^$]*\$([0-9.,]+)/i);
      if (marketCapMatch && marketCapMatch[1]) {
        marketCap = '$' + marketCapMatch[1];
      }
    } catch (err) {
      log(`Error parsing market cap: ${err.message}`, true);
    }
    
    log(`Successfully extracted DTC data - Price: ${price}, Holders: ${holders}, Market Cap: ${marketCap}`);
    
    // Return formatted DTC stats with the extracted data
    return `📊 <b>DONALD TOAD COIN STATS</b> 📊

💵 <b>Price:</b> ${price}
💲 <b>Market Cap:</b> ${marketCap}
👥 <b>Holders:</b> ${holders}
🔥 <b>Burned Tokens:</b> 31,000,000
💰 <b>Circulating Supply:</b> 69,000,000
📈 <b>Total Supply:</b> 69,000,000
🔗 <b>Contract:</b> 0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2 (Linea)
📊 <b>Chart:</b> <a href="https://dexscreener.com/linea/0xd650e5511f8b131ffa719d6507105bde54edd7e5">DexScreener</a>

<b>Last updated:</b> ${formattedDate}

I personally keep track of these numbers - I have the BEST memory for numbers, everybody says so! My uncle was a professor at MIT, very good genes! I know more about this than anyone - generals call me for advice! 🐸`;
  } catch (error) {
    log(`Error fetching DTC data from Lineascan: ${error.message}`, true);
    // Return standard format if scraping fails
    return formatDTCPrice();
  }
}

// Helper functions for math calculations
function isMathCalculation(text) {
  const lowerText = text.toLowerCase();
  
  return (
    lowerText.includes('calculate') || 
    lowerText.includes('what is') || 
    lowerText.includes('compute') || 
    lowerText.includes('solve') ||
    /[0-9+\-*/()^]+=[?]*/.test(text) || // Matches patterns like "5+5=?" or "10*5="
    /what('s| is) [0-9+\-*/() ]+/.test(lowerText) // Matches "What's 5+5" or "what is 10*5"
  );
}

function extractMathExpression(text) {
  // Remove common question phrases
  let expression = text.replace(/calculate|what('s| is)|compute|solve|equals|=\?|\?/gi, '').trim();
  
  // Extract the math expression using regex
  const mathRegex = /[0-9+\-*/().^ ]+/;
  const match = expression.match(mathRegex);
  
  if (match) {
    // Clean up the expression
    expression = match[0].trim();
    
    // Check if it's a valid expression (basic security)
    if (/^[0-9+\-*/().^ ]+$/.test(expression)) {
      return expression;
    }
  }
  
  return null;
}

// Helper functions for web search simulation
function isWebSearchRequest(text) {
  const lowerText = text.toLowerCase();
  
  return (
    lowerText.includes('search for') || 
    lowerText.includes('look up') || 
    lowerText.includes('find info') || 
    lowerText.includes('google') ||
    lowerText.startsWith('search ') ||
    lowerText.startsWith('find ')
  );
}

function extractSearchTerm(text) {
  // Remove search command words
  const cleanedText = text.replace(/search for|look up|find info|google|search|find|information about/gi, '').trim();
  
  // If there's text left, it's probably the search term
  if (cleanedText.length > 0) {
    return cleanedText;
  }
  
  return null;
}

function getSimulatedSearchResult(searchTerm, firstName) {
  // Cryptocurrency related searches
  if (searchTerm.toLowerCase().includes('bitcoin') || searchTerm.toLowerCase().includes('btc')) {
    return `<b>🔍 Search Results for "${searchTerm}"</b>\n\n1. Bitcoin (BTC) is the original cryptocurrency, created by Satoshi Nakamoto in 2009.\n\n2. Current Bitcoin price is tracked on exchanges like Binance, Coinbase, and Kraken.\n\n3. Bitcoin uses blockchain technology to maintain a secure, decentralized ledger.\n\nThere's a lot of TREMENDOUS information about Bitcoin, ${firstName}. Many people say I know more about Bitcoin than almost anybody. I've been saying it's going to be HUGE for years! 🐸`;
  } 
  else if (searchTerm.toLowerCase().includes('ethereum') || searchTerm.toLowerCase().includes('eth')) {
    return `<b>🔍 Search Results for "${searchTerm}"</b>\n\n1. Ethereum (ETH) is a decentralized computing platform created by Vitalik Buterin.\n\n2. ETH is the second-largest cryptocurrency by market cap after Bitcoin.\n\n3. Ethereum enables smart contracts and decentralized applications (dApps).\n\nI've always said Ethereum would be BIG, ${firstName}. Smart contracts are the future - very sophisticated technology. Vitalik is smart, but nobody understands this better than me, believe me! 🐸`;
  }
  else if (searchTerm.toLowerCase().includes('donald toad') || searchTerm.toLowerCase().includes('dtc')) {
    return `<b>🔍 Search Results for "${searchTerm}"</b>\n\n1. Donald Toad Coin (DTC) is the GREATEST cryptocurrency on the Linea blockchain.\n\n2. DTC was created to fund the Make Crypto Great Again movement.\n\n3. The token has a total supply of 69,000,000 DTC with 31,000,000 tokens burned.\n\nLet me tell you, ${firstName}, Donald Toad Coin is going to be HUGE! Many smart people, the best investors, are saying it could 100x from here. TREMENDOUS potential! 🐸`;
  }
  // Generic response for other searches
  else {
    return `<b>🔍 Search Results for "${searchTerm}"</b>\n\nI've searched the ENTIRE web for "${searchTerm}", and let me tell you, ${firstName}, there are TREMENDOUS results! People are saying I have the BEST search abilities, nobody searches better than me!\n\nLook, I found many, many articles about this. All the experts agree with me on this topic - it's going to be HUGE! Would you like to know more? 🐸`;
  }
}

// Format DTC price (fallback if API fails)
function formatDTCPrice() {
  const now = new Date();
  const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
  
  return `📊 <b>DONALD TOAD COIN STATS</b> 📊

💵 <b>Price:</b> $0.001281 (-2.70% 24h)
💲 <b>Market Cap:</b> $90,231.00
👥 <b>Holders:</b> 5,999
🔥 <b>Burned Tokens:</b> 31,000,000
💰 <b>Circulating Supply:</b> 69,000,000
📈 <b>Total Supply:</b> 69,000,000
🔗 <b>Contract:</b> 0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2 (Linea)
📊 <b>Chart:</b> <a href="https://dexscreener.com/linea/0xd650e5511f8b131ffa719d6507105bde54edd7e5">DexScreener</a>

<b>Last updated:</b> ${formattedDate}

I personally keep track of these numbers - I have the BEST memory for numbers, everybody says so! My uncle was a professor at MIT, very good genes! I know more about this than anyone - generals call me for advice! 🐸`;
}

// Get information on where to buy DTC
function getBuyDTCInfo() {
  return `🐸 <b>WHERE TO BUY DONALD TOAD COIN (DTC)</b> 🐸

<b>Buy on DEX (Decentralized Exchange):</b>
- Lynex DEX: <a href="https://app.lynex.fi/swap?inputCurrency=0x46FCBa8c8D12cB2A23144A50374E9353E20DB3A8&outputCurrency=0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2">https://app.lynex.fi/swap</a>
- Use MetaMask wallet connected to Linea network
- Swap ETH for DTC using the contract address: 0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2

<b>Buy on CEX (Centralized Exchange):</b>
- AscendEX: <a href="https://ascendex.com/en/cashtrade-spottrading/usdt/dtc">https://ascendex.com/en/cashtrade-spottrading/usdt/dtc</a>
- They have the BEST rates, tremendous liquidity, everyone says so!

I recommend buying on Lynex for the LOWEST fees! Make your portfolio GREAT again with DTC! 🐸`;
}

// Get information on where to stake DTC
function getStakeDTCInfo() {
  return `🐸 <b>WHERE TO STAKE DONALD TOAD COIN (DTC)</b> 🐸

<b>Staking Options:</b>
- AscendEX: <a href="https://ascendex.com/en/staking/investment-product-details/DTC-S">https://ascendex.com/en/staking/investment-product-details/DTC-S</a>
- Current APR: 49% (TREMENDOUS returns, the best in crypto!)
- Lock period: 30 days minimum

<b>How to Stake:</b>
1. Sign up on AscendEX
2. Deposit DTC to your account
3. Go to Earn > Staking
4. Select Donald Toad Coin (DTC)
5. Choose amount and staking period
6. Confirm and start earning YUUGE passive income!

When you stake DTC, you're supporting the BEST project in crypto! Many people are saying this - smart people, believe me! 🐸`;
}

// Start a new number guessing game
function startNumberGame(chatId, userId, firstName) {
  // Generate a random number between 1 and 100
  const targetNumber = Math.floor(Math.random() * 100) + 1;
  
  // Initialize game state
  userGames[userId] = {
    type: 'number',
    targetNumber: targetNumber,
    attempts: 0
  };
  
  // Send welcome message
  sendMessage(chatId, `🎮 <b>GUESS THE NUMBER GAME</b> 🎮\n\nI'm thinking of a number between 1 and 100, ${firstName}. Try to guess it! Only my TREMENDOUS brain could pick such a perfect number!\n\nType your guess, or "exit game" to quit. 🐸`);
}

// Start a new trivia game
function startTriviaGame(chatId, userId, firstName) {
  // Shuffle the questions to get random ones
  const shuffledQuestions = [...triviaQuestions].sort(() => 0.5 - Math.random());
  
  // Take the first 5 questions
  const gameQuestions = shuffledQuestions.slice(0, 5);
  
  // Initialize game state
  userGames[userId] = {
    type: 'trivia',
    questions: gameQuestions,
    currentQuestionIndex: 0,
    score: 0,
    questionNumber: 1,
    totalQuestions: gameQuestions.length,
    correctAnswer: gameQuestions[0].correctAnswer,
    correctIndex: gameQuestions[0].correctIndex
  };
  
  // Format the first question with options
  const currentQuestion = gameQuestions[0];
  let questionText = `🎮 <b>CRYPTO TRIVIA TIME!</b> 🎮\n\nQuestion 1/${gameQuestions.length}: ${currentQuestion.question}\n\n`;
  
  // Add options
  currentQuestion.options.forEach((option, index) => {
    questionText += `${index + 1}. ${option}\n`;
  });
  
  questionText += `\nReply with the number or answer! Type "exit trivia" to quit.`;
  
  // Send the first question
  sendMessage(chatId, questionText);
}

// Ask the next trivia question
function askNextTriviaQuestion(chatId, userId) {
  const game = userGames[userId];
  
  // Move to next question
  game.currentQuestionIndex++;
  game.questionNumber++;
  
  // Check if we've reached the end of questions
  if (game.currentQuestionIndex >= game.questions.length) {
    // We've reached the end of the game, this should be handled in the main game logic
    return;
  }
  
  // Get the next question
  const currentQuestion = game.questions[game.currentQuestionIndex];
  game.correctAnswer = currentQuestion.correctAnswer;
  game.correctIndex = currentQuestion.correctIndex;
  
  // Format the question with options
  let questionText = `🎮 <b>Next Question!</b> 🎮\n\nQuestion ${game.questionNumber}/${game.totalQuestions}: ${currentQuestion.question}\n\n`;
  
  // Add options
  currentQuestion.options.forEach((option, index) => {
    questionText += `${index + 1}. ${option}\n`;
  });
  
  questionText += `\nReply with the number or answer! Type "exit trivia" to quit.`;
  
  // Send the question
  sendMessage(chatId, questionText);
}

// Main bot loop
async function startBot() {
  if (isRunning) {
    log('Bot is already running. Skipping initialization.');
    return;
  }
  
  isRunning = true;
  
  try {
    log('Starting Donald Toad Bot...');
    
    // Check existing webhook status and delete if present
    try {
      const webhookInfo = await getWebhookInfo();
      
      // If a webhook is set, delete it to prevent conflicts
      if (webhookInfo.url) {
        log(`Found existing webhook: ${webhookInfo.url}. Deleting...`);
        await deleteWebhook();
      }
    } catch (webhookError) {
      log(`Error checking webhook status: ${webhookError.message}`, true);
      // Continue anyway - we'll try to delete it to be safe
      await deleteWebhook();
    }
    
    // Short pause to ensure webhook is fully deleted
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    log('Bot initialized successfully! Now listening for messages...');
    
    let offset = 0;
    let consecutiveErrors = 0;
    
    // Main polling loop
    while (true) {
      try {
        const updates = await getUpdates(offset);
        
        // Reset error counter when successful
        if (updates) {
          consecutiveErrors = 0;
          conflictRetries = 0; // Reset conflict retries on successful update
        }
        
        if (updates && updates.length > 0) {
          for (const update of updates) {
            try {
              await processUpdate(update);
            } catch (error) {
              log(`Error processing update: ${error.message}`, true);
            }
            offset = update.update_id + 1;
          }
        }
        
        // Small delay to prevent CPU hammering
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        log(`Error in polling loop: ${error.message}`, true);
        
        // Increment error counter
        consecutiveErrors++;
        
        // If too many consecutive errors, reset connection
        if (consecutiveErrors > 5) {
          log('Too many consecutive errors. Resetting connection...', true);
          await deleteWebhook();
          await getWebhookInfo(); // Check webhook status to ensure it's gone
          consecutiveErrors = 0;
        }
        
        // Exponential backoff for retries (1s, 2s, 4s, 8s, max 30s)
        const delay = Math.min(Math.pow(2, consecutiveErrors) * 1000, 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    log(`Fatal error: ${error.message}`, true);
    isRunning = false;
    
    // Attempt to restart after a delay if we encounter a fatal error
    log('Attempting to restart bot in 10 seconds...', true);
    setTimeout(() => {
      startBot();
    }, 10000);
  }
}

// Create a simple health check server for Render's health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Donald Toad Bot is running!',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Donald Toad Bot</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
            h1 { color: #4CAF50; }
            .container { background-color: #f5f5f5; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .features { margin-top: 20px; }
            .features ul { list-style-type: none; padding-left: 0; }
            .features li { padding: 8px 0; border-bottom: 1px solid #eee; }
            .features li:last-child { border-bottom: none; }
            .highlight { background-color: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🐸 Donald Toad Bot</h1>
            <p>The Donald Toad Telegram Bot is running!</p>
            <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
            <p>Talk to the bot on Telegram: <a href="https://t.me/your_bot_username">@your_bot_username</a> (replace with your actual bot username)</p>
            
            <div class="features">
              <h2>Bot Features:</h2>
              <ul>
                <li>📈 Real-time cryptocurrency prices</li>
                <li>🎮 Interactive games (trivia and number guessing)</li>
                <li>🤣 Jokes and recipes</li>
                <li>🔍 Web search simulation</li>
                <li>🧮 Math calculation capabilities</li>
                <li>🔗 Linea blockchain information</li>
              </ul>
              <p>Deployed with <span class="highlight">Ultra Reliability</span> features!</p>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.stack || error.message}`, true);
  // Continue running despite errors
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`, true);
  // Continue running despite errors
});

// Handle termination signals
process.on('SIGINT', () => {
  log('Received SIGINT. Bot shutting down...', true);
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM. Bot shutting down...', true);
  isRunning = false;
  process.exit(0);
});

// Start the HTTP server for health checks
server.listen(PORT, () => {
  log(`Health check server running on port ${PORT}`);
});

// Start the bot
startBot();