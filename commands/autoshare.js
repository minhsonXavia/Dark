const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'autoshare',
    description: 'Tự động buff share cho bài viết Facebook',
    aliases: ['share', 'buffshare'],
    category: 'Facebook Tools',
    cooldown: 10,
    usage: 'autoshare <cookie> <link> <số lượng>',
    credit: 'Vern API',
    
    async execute(message, args, client) {
        try {
            // Kiểm tra đủ tham số
            if (args.length < 3) {
                const usageEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Thiếu Tham Số')
                    .setDescription('Vui lòng cung cấp đầy đủ thông tin!')
                    .addFields(
                        { name: '📝 Cú pháp', value: '```autoshare <cookie> <link> <số lượng>```' },
                        { name: '💡 Ví dụ', value: '```autoshare your_cookie https://facebook.com/post/123 100```' }
                    )
                    .setFooter({ text: '⚠️ Lưu ý: Cookie cần có quyền truy cập' })
                    .setTimestamp();
                
                return message.reply({ embeds: [usageEmbed] });
            }

            const cookie = args[0];
            const link = args[1];
            const limit = parseInt(args[2]);

            // Validate số lượng
            if (isNaN(limit) || limit <= 0 || limit > 1000) {
                return message.reply('❌ Số lượng phải là số từ 1 đến 1000!');
            }

            // Validate link Facebook
            if (!link.includes('facebook.com') && !link.includes('fb.com')) {
                return message.reply('❌ Link không hợp lệ! Vui lòng nhập link Facebook.');
            }

            // Tạo embed ban đầu
            const startTime = Date.now();
            const progressEmbed = new EmbedBuilder()
                .setColor('#4267B2')
                .setTitle('🔄 Đang Buff Share')
                .setDescription('📊 **Tiến Trình Buff Share Facebook**')
                .addFields(
                    { name: '🎯 Mục tiêu', value: `\`${limit}\` shares`, inline: true },
                    { name: '✅ Đã buff', value: '`0` shares', inline: true },
                    { name: '📈 Tiến độ', value: '`0%`', inline: true },
                    { name: '🔗 Link bài viết', value: `[Xem bài viết](${link})` },
                    { name: '⏱️ Thời gian', value: '`Đang tính toán...`', inline: true },
                    { name: '⚡ Trạng thái', value: '`🟡 Đang xử lý...`', inline: true }
                )
                .setFooter({ text: 'Auto Share by Vern API' })
                .setTimestamp();

            const statusMsg = await message.reply({ embeds: [progressEmbed] });

            // Gọi API
            const apiUrl = `https://vern-rest-api.vercel.app/api/autoshare?cookie=${encodeURIComponent(cookie)}&link=${encodeURIComponent(link)}&limit=${limit}`;
            
            let totalShared = 0;
            let isCompleted = false;
            
            // Hàm cập nhật embed
            const updateEmbed = (shared, percentage, status, color = '#4267B2') => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                
                // Tính toán thời gian còn lại ước tính
                let remainingTime = 'Đang tính...';
                if (shared > 0 && percentage < 100) {
                    const avgTimePerShare = elapsed / shared;
                    const remainingShares = limit - shared;
                    const remainingSeconds = Math.ceil(avgTimePerShare * remainingShares);
                    const remMin = Math.floor(remainingSeconds / 60);
                    const remSec = remainingSeconds % 60;
                    remainingTime = remMin > 0 ? `~${remMin}m ${remSec}s` : `~${remSec}s`;
                }

                // Tạo thanh tiến trình
                const progressBarLength = 20;
                const filledLength = Math.round((percentage / 100) * progressBarLength);
                const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);

                const updatedEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(isCompleted ? '✅ Buff Share Hoàn Thành!' : '🔄 Đang Buff Share')
                    .setDescription(`📊 **Tiến Trình Buff Share Facebook**\n\n\`${progressBar}\` **${percentage.toFixed(1)}%**`)
                    .addFields(
                        { name: '🎯 Mục tiêu', value: `\`${limit}\` shares`, inline: true },
                        { name: '✅ Đã buff', value: `\`${shared}\` shares`, inline: true },
                        { name: '📈 Tỷ lệ', value: `\`${percentage.toFixed(1)}%\``, inline: true },
                        { name: '🔗 Link bài viết', value: `[Xem bài viết](${link})` },
                        { name: '⏱️ Đã chạy', value: `\`${timeStr}\``, inline: true },
                        { name: '⏳ Còn lại', value: `\`${remainingTime}\``, inline: true },
                        { name: '⚡ Trạng thái', value: status, inline: true }
                    )
                    .setFooter({ text: 'Auto Share by Vern API' })
                    .setTimestamp();

                return updatedEmbed;
            };

            // Polling để cập nhật tiến trình
            const pollInterval = setInterval(async () => {
                if (isCompleted) {
                    clearInterval(pollInterval);
                    return;
                }

                try {
                    const response = await axios.get(apiUrl, { 
                        timeout: 15000,
                        validateStatus: (status) => status < 500
                    });
                    
                    const data = response.data;
                    
                    if (data.status && data.success_count) {
                        totalShared = data.success_count;
                        const percentage = (totalShared / limit) * 100;
                        
                        // Cập nhật embed
                        const embed = updateEmbed(
                            totalShared,
                            percentage,
                            percentage >= 100 ? '`🟢 Hoàn thành!`' : '`🟡 Đang buff...`',
                            percentage >= 100 ? '#00FF00' : '#4267B2'
                        );
                        
                        await statusMsg.edit({ embeds: [embed] });
                        
                        // Nếu đã đủ số lượng thì dừng
                        if (totalShared >= limit || percentage >= 100) {
                            isCompleted = true;
                            clearInterval(pollInterval);
                            
                            // Gửi thông báo hoàn thành
                            const completeEmbed = updateEmbed(
                                totalShared,
                                100,
                                '`🟢 Hoàn thành!`',
                                '#00FF00'
                            );
                            
                            await statusMsg.edit({ embeds: [completeEmbed] });
                            await message.channel.send(`✅ ${message.author} Đã buff thành công **${totalShared}** shares!`);
                        }
                    }
                } catch (pollError) {
                    console.error('❌ Lỗi khi poll API:', pollError.message);
                }
            }, 3000); // Cập nhật mỗi 3 giây

            // Timeout sau 5 phút
            setTimeout(() => {
                if (!isCompleted) {
                    clearInterval(pollInterval);
                    isCompleted = true;
                    
                    const timeoutEmbed = updateEmbed(
                        totalShared,
                        (totalShared / limit) * 100,
                        '`🔴 Timeout!`',
                        '#FF0000'
                    );
                    
                    statusMsg.edit({ embeds: [timeoutEmbed] });
                    message.channel.send('⏱️ Quá trình buff đã timeout sau 5 phút. Vui lòng thử lại!');
                }
            }, 300000); // 5 phút

        } catch (error) {
            console.error('❌ Lỗi lệnh autoshare:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Lỗi Buff Share')
                .setDescription('Đã xảy ra lỗi trong quá trình buff share!')
                .addFields(
                    { name: '🔍 Chi tiết lỗi', value: `\`\`\`${error.message}\`\`\`` }
                )
                .setFooter({ text: '💡 Vui lòng kiểm tra lại cookie và link' })
                .setTimestamp();
            
            try {
                await message.reply({ embeds: [errorEmbed] });
            } catch (replyError) {
                console.error('❌ Không thể gửi error message:', replyError);
            }
        }
    }
};
