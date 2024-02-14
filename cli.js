#!/usr/bin/env node

import fs from 'fs';
import meow from 'meow';
import {installPackage} from '@antfu/install-pkg';
import * as p from '@clack/prompts';
import {parseModule} from 'magicast';
import {camelCase} from 'scule';

const cli = meow(
	`
	Usage
		$ npm-install-and-import
		$ npmii

	Options
		--name, -n     Package to install
		--filename, -f Filename where you want to add import statement to

	Examples
		$ npm-install-and-import
		$ npm-install-and-import --name consola
		$ npm-install-and-import --name consola --filename src/ui.js
`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
				shortFlag: 'p',
			},
			filename: {
				type: 'string',
				shortFlag: 'f',
			},
		},
	},
);

p.intro('npm-install-and-import setup');

let {name, filename} = cli.flags;

const handleCancel = value => {
	if (p.isCancel(value)) {
		p.cancel('Operation cancelled.');
		process.exit(0);
	}
};

if (!name) {
	name = await p.text({
		name: 'name',
		message: 'What package you want to install?',
	});

	handleCancel(name);
}

if (!filename) {
	filename = await p.text({
		name: 'file',
		message: 'Specify a file to add import statement to',
		validate(value) {
			if (!fs.existsSync(value)) return `File ${value} does not exist.`;
		},
	});

	handleCancel(filename);
}

const s = p.spinner();

s.start(`Installing ${name}`);
await installPackage(name, {silent: true});
s.stop(`Installed ${name}`);

try {
	const parsed = parseModule(fs.readFileSync(filename, 'utf8'));

	parsed.imports.$add({
		from: name,
		local: '',
		imported: camelCase(name),
	});

	fs.writeFileSync(filename, parsed.generate().code);

	p.outro(
		`Package have been installed and import statement added to the ${filename} file.`,
	);
} catch (err) {
	p.cancel(
		`The following error: "${err.message}" was occured while parsing provided source file. Please ensure the content of the file is correct.`,
	);
}
