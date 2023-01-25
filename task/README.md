# Taskfile.ts Usage

Thanks to https://dev.to/vonheikemen/a-simple-way-to-replace-npm-scripts-in-deno-4j0g for this simple but powerful idea.

## Set up aliases

Linux setup, as suggested in https://github.com/netspective-studios/home-creators/blob/main/dot_config/z4h-zshrc/deno.auto.zshrc.tmpl:

```bash
# cwd-task runs Taskfile.ts at the current working directory only
alias cwd-task='deno run --unstable -A ./Taskfile.ts'

# path-task runs Taskfile.ts at the current path, parent path, or ancestor paths (whichever comes first)
alias path-task=$'deno run --unstable -A $(/bin/bash -c \'file=Taskfile.ts; path=$(pwd); while [[ "$path" != "" && ! -e "$path/$file" ]]; do path=${path%/*}; done; echo "$path/$file"\')'

# repo-task runs Taskfile.ts at the Git repo's home directory (same as legacy deno-task alias)
alias repo-task='deno run --unstable -A $(git rev-parse --show-toplevel)/Taskfile.ts'
```

Windows PowerShell setup would be something like this (TODO: figure out the automation like above for repo-task and path-task):

```powershell
Set-Alias -Name cwd-task -Value deno run --unstable -A ./Taskfile.ts
Set-Alias -Name path-task -Value deno run --unstable -A ...???
Set-Alias -Name repo-task -Value deno run --unstable -A ...???
```

## Operate aliases

```bash
repo-task inspect    # runs Taskfile.ts 'inspect' task at the Git repo root directory
path-task inspect    # runs Taskfile.ts 'inspect' task at either the current directory, parent, or ancestor (whichever is found first)
cwd-task inspect     # runs Taskfile.ts 'inspect' task in the current working directory
```

# Tips & Tricks

## Use deno-dzx or other shell wrappers

See [github.com/linux-china/dx](https://github.com/linux-china/dx) and [github.com/c4spar/deno-dzx](https://github.com/c4spar/deno-dzx) for nice Deno-friendly shell wrappers. `linux-china/dx` seems more sophisticated and might be a good place to start.

## Be flexible to caller: allow _import_ **or** _execute_

Each `Taskfile.ts` should operate either as a library of tasks (if it defines any) or should be "executable" based on the caller's discretion. An easy way to do that is to define the execution portion like this:

```ts
// only execute tasks if Taskfile.ts is being called as a script; otherwise
// it might be imported for tasks or other reasons and we shouldn't "run".
if (import.meta.main) {
  await t.eventEmitterCLI(Deno.args, new Tasks());
}
```

# TODO

* tasks should use console-independent telemetry like Deno loggers or [Deno OpenTelemetry](https://github.com/open-telemetry/opentelemetry-js/issues/2293#issuecomment-1030750431) for statusing, messaging, etc. so that we can use tasks at CLI or anywhere else
* integrate [udd](https://github.com/hayd/deno-udd) as a built-in task so `find . -name "*.ts" | xargs udd` is not required outside of Deno
* wrap [xargs](https://github.com/tarruda/node-xargs) in this module?
* wrap [deno xeval](https://deno.land/std/examples/xeval.ts) in this module? [elaboration](https://stefanbuck.com/blog/hidden-superpower-deno-xeval)
