import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js'
import ytdl from '@distube/ytdl-core'
import searchYouTube from 'yt-search'
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discordjs/voice'

const data = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play youtube URL')
	.addStringOption((option) => option.setRequired(true).setName('url').setDescription('The youtube URL to play!'))

const songMap = new Map()
const execute = async (interaction: ChatInputCommandInteraction) => {
	let video = interaction.options.getString('url')!

	// Validate the URL
	if (!ytdl.validateURL(video)) {
		const { videos } = await searchYouTube(video)
		if (!videos.length) {
			return interaction.reply({ content: 'Please provide a valid YouTube URL.', ephemeral: true })
		} else {
			video = videos[0].url
		}
	}

	// Get the user's voice channel

	const member = interaction.member as GuildMember
	const voiceChannel = member.voice.channel
	if (!voiceChannel) {
		return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true })
	}

	await interaction.deferReply()

	try {
		songMap.get(voiceChannel.id + 'player')?.stop()
		songMap.get(voiceChannel.id + 'connection')?.disconnect()

		// Join the voice channel
		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild!.id,
			adapterCreator: interaction.guild!.voiceAdapterCreator,
		})

		// Download and stream audio
		const ytStream = ytdl(video, { filter: 'audioonly', highWaterMark: 1 << 25 })

		const resource = createAudioResource(ytStream, { inlineVolume: true })
		const player = createAudioPlayer()

		songMap.set(voiceChannel.id + 'connection', connection)
		songMap.set(voiceChannel.id + 'player', player)

		player.on(AudioPlayerStatus.Idle, () => connection?.destroy())
		connection.subscribe(player)
		player.play(resource)

		// Handle the player lifecycle
		player.on('error', (error) => console.error('Error:', error.message))
		player.on('stateChange', (oldState, newState) => {
			console.log(`Player transitioned from ${oldState.status} to ${newState.status}`)
		})

		connection.subscribe(player)
		player.play(resource)
		songMap.set(voiceChannel.id, player)

		// Respond to the user
		return interaction.editReply({ content: `Now playing: ${video}` })
	} catch (error) {
		console.error(error)
		return interaction.editReply({ content: 'There was an error playing the video.' })
	}
}

export { data, execute }
