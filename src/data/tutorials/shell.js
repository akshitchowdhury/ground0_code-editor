// Guided Linux/Shell track. The terminal is the workspace here — lessons
// guide the learner to type commands, and each level also ships a small
// script they can run with the script editor.

const levels = [
  {
    id: 'sh-1',
    title: 'Finding your way around',
    summary: 'pwd, ls, cd — navigate the filesystem.',
    blocks: [
      { type: 'p', text: 'A shell is a text interface to the computer. You are in a simulated Linux home directory at `/home/learner`. Three commands cover most navigation:' },
      { type: 'list', items: ['`pwd` — print working directory (where am I?)', '`ls` — list what is here (`ls -l` for details, `ls -a` for hidden files)', '`cd <dir>` — move into a directory; `cd ..` goes up; `cd` alone goes home'] },
      { type: 'h3', text: 'Try it in the terminal' },
      { type: 'code', text: `pwd\nls\ncd notes\nls\ncat shopping.txt\ncd ..` },
      { type: 'p', text: 'When you are done exploring, run the level script with **Run Script** to see a full tour, then mark the level complete.' },
    ],
    starterCode: `#!/bin/bash\n# Level 1 — navigation tour\npwd\nls\ncd notes\npwd\nls\ncd ..\ntree\n`,
    solutionCode: `#!/bin/bash\npwd\nls -l\ncd notes\ncat shopping.txt\ncd ~\ntree\n`,
  },
  {
    id: 'sh-2',
    title: 'Making files & folders',
    summary: 'mkdir, touch, and the tree view.',
    blocks: [
      { type: 'p', text: 'Now create your own structure. `mkdir` makes directories (`-p` creates nested paths in one go) and `touch` creates empty files.' },
      { type: 'code', text: `mkdir my-app\ncd my-app\nmkdir -p src/components\ntouch src/index.js\ntouch readme.md\ntree` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create a `website` directory with `css` and `js` subdirectories.', 'Add `index.html` inside `website` and `style.css` inside `css`.', 'Verify with `tree website`.'] },
    ],
    starterCode: `#!/bin/bash\n# Level 2 — build this structure:\n# website/\n# ├── index.html\n# ├── css/\n# │   └── style.css\n# └── js/\n\nmkdir website\n# ...continue here\n`,
    solutionCode: `#!/bin/bash\nmkdir -p website/css website/js\ntouch website/index.html\ntouch website/css/style.css\ntree website\n`,
  },
  {
    id: 'sh-3',
    title: 'Reading & writing files',
    summary: 'cat, echo, and the > / >> redirections.',
    blocks: [
      { type: 'p', text: 'The shell can write files without any editor. The `>` operator sends a command\'s output into a file (overwriting it), while `>>` appends to the end.' },
      { type: 'code', text: `echo "# My Journal" > journal.md\necho "Day 1: learned redirection" >> journal.md\ncat journal.md\nwc -l journal.md` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create `todo.txt` with three lines using `echo` and `>>`.', 'Print it with `cat`, count lines with `wc -l`.', 'Overwrite it with a single new line using `>` and check what happened.'] },
    ],
    starterCode: `#!/bin/bash\n# Level 3 — write a todo list with echo and redirection\n\necho "1. learn the shell" > todo.txt\n# add two more lines with >>\n# print and count it\n`,
    solutionCode: `#!/bin/bash\necho "1. learn the shell" > todo.txt\necho "2. master redirection" >> todo.txt\necho "3. take a break" >> todo.txt\ncat todo.txt\nwc -l todo.txt\necho "all done!" > todo.txt\ncat todo.txt\n`,
  },
  {
    id: 'sh-4',
    title: 'Copy, move, delete',
    summary: 'cp, mv, rm — manage files safely.',
    blocks: [
      { type: 'p', text: 'Three commands manage files: `cp src dst` copies, `mv src dst` moves or renames, and `rm` deletes (add `-r` for directories — and be careful, there is no trash bin).' },
      { type: 'code', text: `echo "draft v1" > draft.txt\ncp draft.txt backup.txt\nmv draft.txt final.txt\nls\nrm backup.txt` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Make a `docs` directory with a file `notes.txt` in it.', 'Copy `notes.txt` to `notes-backup.txt` inside `docs`.', 'Rename the original to `meeting-notes.txt` with `mv`.', 'Delete the backup, then `tree docs` to verify.'] },
    ],
    starterCode: `#!/bin/bash\n# Level 4 — practice cp / mv / rm inside a docs directory\n\nmkdir docs\necho "remember the milk" > docs/notes.txt\n# copy, rename, delete...\n`,
    solutionCode: `#!/bin/bash\nmkdir docs\necho "remember the milk" > docs/notes.txt\ncp docs/notes.txt docs/notes-backup.txt\nmv docs/notes.txt docs/meeting-notes.txt\nrm docs/notes-backup.txt\ntree docs\n`,
  },
  {
    id: 'sh-5',
    title: 'Searching with grep & pipes',
    summary: 'Filter output by chaining commands together.',
    blocks: [
      { type: 'p', text: 'The pipe `|` sends one command\'s output into the next — this is the superpower of the shell. `grep PATTERN` keeps only matching lines (`-i` ignores case).' },
      { type: 'code', text: `cat notes/shopping.txt | grep milk\nls | grep notes\nhead -n 2 notes/shopping.txt\ncat notes/shopping.txt | grep -i COFFEE | wc -l` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Create `servers.txt` where each line is `name status` (mix of `up` and `down`).', 'Use `grep` to show only the `down` servers.', 'Pipe through `wc -l` to count them.'] },
    ],
    starterCode: `#!/bin/bash\n# Level 5 — grep and pipes\n\necho "web-1 up" > servers.txt\necho "web-2 down" >> servers.txt\necho "db-1 up" >> servers.txt\necho "cache-1 down" >> servers.txt\n\n# show only "down" servers, then count them\n`,
    solutionCode: `#!/bin/bash\necho "web-1 up" > servers.txt\necho "web-2 down" >> servers.txt\necho "db-1 up" >> servers.txt\necho "cache-1 down" >> servers.txt\n\ncat servers.txt | grep down\ncat servers.txt | grep down | wc -l\n`,
  },
  {
    id: 'sh-6',
    title: 'Variables & your first script',
    summary: 'Put it all together in a real shell script.',
    blocks: [
      { type: 'p', text: 'Shell variables are assigned with `NAME=value` (no spaces around `=`) and read with `$NAME`. Combined with everything so far, you can write real scripts — sequences of commands that run top to bottom.' },
      { type: 'code', text: `PROJECT=my-site\nmkdir -p $PROJECT/src\necho "# $PROJECT" > $PROJECT/readme.md\ncat $PROJECT/readme.md` },
      { type: 'h3', text: 'Your task' },
      { type: 'list', items: ['Write a script that defines `PROJECT` and `AUTHOR` variables.', 'It should scaffold `$PROJECT/` with `src/` and `docs/` folders.', 'Generate a `readme.md` mentioning both variables.', 'Finish with `tree $PROJECT` to show the result.'] },
    ],
    starterCode: `#!/bin/bash\n# Level 6 — project scaffolder\n\nPROJECT=cool-app\nAUTHOR=learner\n\n# create $PROJECT with src/ and docs/\n# write a readme.md using the variables\n# show the tree\n`,
    solutionCode: `#!/bin/bash\nPROJECT=cool-app\nAUTHOR=learner\n\nmkdir -p $PROJECT/src $PROJECT/docs\necho "# $PROJECT" > $PROJECT/readme.md\necho "Created by $AUTHOR" >> $PROJECT/readme.md\ntouch $PROJECT/src/main.sh\ncat $PROJECT/readme.md\ntree $PROJECT\n`,
  },
]

export default levels
