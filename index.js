require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');

// Tạo client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Collection để lưu commands
client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();

// Màu sắc cho console
const colors = [
    "FF9900", "FFFF33", "33FFFF", "FF99FF", "FF3366", "FFFF66", "FF00FF", "66FF99",
    "00CCFF", "FF0099", "FF0066", "0033FF", "FF9999", "00FF66", "00FFFF", "CCFFFF",
    "8F00FF", "FF00CC", "FF0000", "FF1100", "FF3300", "FF4400", "FF5500", "FF6600",
    "FF7700", "FF8800", "FF9900", "FFaa00", "FFbb00", "FFcc00", "FFdd00", "FFee00",
    "FFff00", "FFee00", "FFdd00", "FFcc00", "FFbb00", "FFaa00", "FF9900", "FF8800",
    "FF7700", "FF6600", "FF5500", "FF4400", "FF3300", "FF2200", "FF1100"
];

// Hàm chuyển hex sang ANSI color
function hexToAnsi(hex) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}

// Hàm in text với nhiều màu
function colorfulText(text) {
    let result = '';
    const chars = text.split('');
    chars.forEach((char, index) => {
        const colorIndex = index % colors.length;
        result += hexToAnsi(colors[colorIndex]) + char;
    });
    return result + '\x1b[0m';
}

// Hàm in thông tin với màu sắc
function printColorful(label, value) {
    console.log(`${colorfulText('[DISCORD]')} ${colorfulText('↣' + label + ':')} ${colorfulText(value)}`);
}

// Load commands từ thư mục commands
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.log('⚠️ Thư mục commands không tồn tại. Tạo thư mục...');
        fs.mkdirSync(commandsPath, { recursive: true });
        return;
    }

    const commandFolders = fs.readdirSync(commandsPath);
    let totalCommands = 0;

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);

                if ('name' in command && 'execute' in command) {
                    client.commands.set(command.name, command);
                    
                    // Load aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            client.aliases.set(alias, command.name);
                        });
                    }
                    
                    totalCommands++;
                    console.log(`✅ Loaded: ${command.name} (${folder})`);
                } else {
                    console.log(`⚠️ Lỗi: ${file} thiếu "name" hoặc "execute"`);
                }
            } catch (error) {
                console.error(`❌ Lỗi khi load ${file}:`, error.message);
            }
        }
    }

    return totalCommands;
}

// Load events
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    
    if (!fs.existsSync(eventsPath)) {
        console.log('⚠️ Thư mục events không tồn tại.');
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            
            console.log(`✅ Loaded event: ${event.name}`);
        } catch (error) {
            console.error(`❌ Lỗi khi load event ${file}:`, error.message);
        }
    }
}

// Lấy IP public
async function getPublicIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        return response.data.ip;
    } catch (error) {
        return 'Không xác định';
    }
}

// Lấy thông tin nhà mạng
async function getISP(ip) {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 5000 });
        return response.data.isp || 'Không xác định';
    } catch (error) {
        return 'Không xác định';
    }
}

// Thời gian bắt đầu bot
const startTime = Date.now();

// Event khi bot ready
client.once('ready', async () => {
    console.log('\n' + '='.repeat(60));
    console.log(colorfulText('            🤖 DISCORD BOT ĐANG HOẠT ĐỘNG 🤖            '));
    console.log('='.repeat(60) + '\n');

    // Load commands và events
    const totalCommands = loadCommands();
    loadEvents();

    // Lấy thông tin
    const publicIP = await getPublicIP();
    const isp = await getISP(publicIP);
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

    // In thông tin bot
    console.log('');
    printColorful('[TOKEN👌]', process.env.TOKEN ? `${process.env.TOKEN.slice(0, 30)}...` : 'Chưa cấu hình');
    printColorful('[PREFIX🌻]', process.env.PREFIX || '/');
    printColorful('[IP🌏]', publicIP);
    printColorful('[SỐ SERVER🏡]', client.guilds.cache.size.toString());
    printColorful('[TỔNG THỜI XỬ LÍ⌚]', uptimeStr);
    printColorful('[TỔNG SỐ LỆNH📂]', totalCommands.toString());
    printColorful('[TÊN/ID BOT🆔]', `${client.user.tag} (${client.user.id})`);
    printColorful('[PING🏓]', `${client.ws.ping}ms`);
    printColorful('[Nhà Mạng📶]', isp);
    console.log('\n' + '='.repeat(60) + '\n');

    // Set bot activity
    client.user.setActivity({
        name: `${process.env.PREFIX}help | ${client.guilds.cache.size} servers`,
        type: ActivityType.Watching
    });

    // Cập nhật activity mỗi 5 phút
    setInterval(() => {
        client.user.setActivity({
            name: `${process.env.PREFIX}help | ${client.guilds.cache.size} servers`,
            type: ActivityType.Watching
        });
    }, 300000);
});

// Event xử lý messages (prefix commands)
client.on('messageCreate', async (message) => {
    // Ignore bots và messages không có prefix
    if (message.author.bot) return;
    
    const prefix = process.env.PREFIX || '/';
    if (!message.content.startsWith(prefix)) return;

    // Parse command và args
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Tìm command
    const command = client.commands.get(commandName) || 
                   client.commands.get(client.aliases.get(commandName));

    if (!command) return;

    // Kiểm tra cooldown
    if (command.cooldown) {
        const cooldowns = client.cooldowns;
        
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`⏱️ Vui lòng đợi ${timeLeft.toFixed(1)}s trước khi dùng lệnh \`${command.name}\` lại!`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    // Thực thi command
    try {
        await command.execute(message, args, client);
        console.log(`✅ ${message.author.tag} đã dùng lệnh: ${command.name}`);
    } catch (error) {
        console.error(`❌ Lỗi khi thực thi ${command.name}:`, error);
        try {
            await message.reply('❌ Có lỗi xảy ra khi thực thi lệnh!');
        } catch (replyError) {
            console.error('❌ Không thể gửi error message:', replyError);
        }
    }
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
});

// Login bot
client.login(process.env.TOKEN).catch(error => {
    console.error('❌ Lỗi khi đăng nhập bot:', error);
    process.exit(1);
});
