import { Collection } from 'discord.js'
import path from 'path'
import fs from 'fs'

const commands = new Collection<string, { data: any; execute: any }>()

const initCommands = async () => {
	const foldersPath = path.join(process.cwd(), 'src/commands')
	const commandFolders = fs.readdirSync(foldersPath)

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder)
		const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'))
		for await (const file of commandFiles) {
			const filePath = path.join(commandsPath, file)
			const command = await import(filePath)
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			if ('data' in command && 'execute' in command) {
				commands.set(command.data.name, command)
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`)
			}
		}
	}
}

export default commands
export { initCommands }
