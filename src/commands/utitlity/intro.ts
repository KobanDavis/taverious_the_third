import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

const data = new SlashCommandBuilder()
	.setName('intro')
	.setDescription('Upload an audio file to play when you join a voice channel.')
	.addAttachmentOption((option) => option.setRequired(true).setName('audio').setDescription('The audio file to play.'))

const validExtensions = ['.mp3', '.flac', '.opus', '.ogg', '.wav', '.aac']

const execute = async (interaction: ChatInputCommandInteraction) => {
	await interaction.deferReply()
	const attachment = interaction.options.getAttachment('audio')!
	const extension = '.' + attachment.name.split('.').reverse()[0]

	if (!validExtensions.includes(extension)) {
		return interaction.editReply(
			`Invalid extension on uploaded file: \`${extension}\`. Please use one of the following formats:\n\`${validExtensions.join(', ')}\``
		)
	}

	if (attachment.size > 1024 ** 2) {
		return interaction.editReply('File size too large. Ensure file is 1MB or below.')
	}

	const soundPath = path.resolve(process.cwd(), './src/assets/uploads/', interaction.user.id + extension)
	const stream = fs.createWriteStream(soundPath)
	const { body } = await fetch(attachment.url)
	if (body === null) return

	await finished(Readable.fromWeb(body as any).pipe(stream))

	await interaction.editReply('Intro uploaded.')
}

export { data, execute }
