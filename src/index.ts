import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'

import { Client, Events, GatewayIntentBits } from 'discord.js'
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice'
import commands, { initCommands } from './commands'

dotenv.config()
initCommands()

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] })

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

let prevUID: string
client.on(Events.VoiceStateUpdate, async (prevState, nextState) => {
	if (prevState.channelId === nextState.channelId || !nextState.channelId) {
		if (prevUID === nextState.id) {
			getVoiceConnection(nextState.guild.id)?.destroy()
		}
		return
	}

	const uploadsFolderPath = path.resolve(process.cwd(), './src/assets/uploads')
	const dir = await fs.readdir(uploadsFolderPath)
	const file = dir.find((file) => file.startsWith(nextState.id))

	if (file) {
		const connection = joinVoiceChannel({
			adapterCreator: nextState.guild.voiceAdapterCreator,
			channelId: nextState.channelId,
			guildId: nextState.guild.id,
		})

		const player = createAudioPlayer()

		const songPath = path.resolve(uploadsFolderPath, file)
		const resource = createAudioResource(songPath, { inlineVolume: true })

		player.on(AudioPlayerStatus.Idle, () => connection.destroy())
		resource.volume!.setVolume(0.1)
		connection.subscribe(player)
		player.play(resource)
		prevUID = nextState.id
	}
})

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return

	const command = commands.get(interaction.commandName)

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`)
		return
	}

	try {
		await command.execute(interaction)
	} catch (error) {
		console.error(error)
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
		}
	}
})

client.login(process.env.BOT_TOKEN)
