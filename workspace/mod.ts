import { path } from "./deps.ts";

export type WorkspaceEditorIdentity = string;
export type EditableSourceFilePathAndName = string;
export type EditableSourceURI = string;
export type EditableTargetURI = string;

export interface WorkspaceEditorTarget {
  readonly identity: WorkspaceEditorIdentity;
  readonly editableTargetURI: EditableTargetURI;
  readonly openInWorkspaceHTML?: (classes?: string) => string;
}

export interface WorkspaceEditorTargetResolver<
  Target extends WorkspaceEditorTarget,
> {
  (
    src: EditableSourceFilePathAndName | EditableSourceURI,
    line?: number,
  ): Target | undefined;
}

export function envWorkspaceEditorResolver(
  prime: string,
): WorkspaceEditorTargetResolver<WorkspaceEditorTarget> {
  const type = Deno.env.get(prime);
  if (type) {
    switch (type) {
      case "vscode": // @deprecated: non-specific "vscode" is depracated, use specific vscode-* below
      case "vscode-wsl":
        return vscodeWslRemoteEditorResolver(
          Deno.env.get(`${prime}_VSCODE_REMOTE_DISTRO`) || "Debian",
        );
      case "vscode-ssh-remote":
        return vscodeSshRemoteEditorResolver(
          Deno.env.get(`${prime}_VSCODE_REMOTE_HOSTNAME`) ||
            `${prime}_VSCODE_REMOTE_HOSTNAME not supplied`,
        );
      case "vscode-windows":
        return vscodeWindowsRemoteEditorResolver();
      case "vscode-linux":
        return vscodeLinuxRemoteEditorResolver();
      case "vscode-mac":
        return vscodeMacRemoteEditorResolver();
    }
  }
  return () => undefined;
}

export interface VsCodeWslWorkspaceEditorTarget extends WorkspaceEditorTarget {
  readonly wslDistroName: string;
}

export interface VsCodeSshWorkspaceEditorTarget extends WorkspaceEditorTarget {
  readonly sshHostName: string;
}

export function vscodeWslRemoteEditorResolver(
  wslDistroName: string,
): WorkspaceEditorTargetResolver<VsCodeWslWorkspaceEditorTarget> {
  return (src, line) => {
    if (src.startsWith("file:")) {
      src = path.fromFileUrl(src);
    }
    if (!src.startsWith("/")) src = `/${src}`;
    const editableTargetURI =
      `vscode://vscode-remote/wsl+${wslDistroName}${src}:${line || 1}`;
    return {
      identity: "vscode",
      wslDistroName,
      editableTargetURI,
      // deno-fmt-ignore
      openInWorkspaceHTML: (classes) =>`<a href="${editableTargetURI}" ${classes ? ` class="${classes}"` : ""} title="${editableTargetURI}">Open in VS Code</a>`,
    };
  };
}

export function vscodeSshRemoteEditorResolver(
  sshHostName: string,
): WorkspaceEditorTargetResolver<VsCodeSshWorkspaceEditorTarget> {
  return (src, line) => {
    if (src.startsWith("file:")) {
      src = path.fromFileUrl(src);
    }
    if (!src.startsWith("/")) src = `/${src}`;
    const editableTargetURI =
      `vscode://vscode-remote/ssh-remote+${sshHostName}${src}:${line || 1}`;
    return {
      identity: "vscode",
      sshHostName,
      editableTargetURI,
      // deno-fmt-ignore
      openInWorkspaceHTML: (classes) =>`<a href="${editableTargetURI}" ${classes ? ` class="${classes}"` : ""} title="${editableTargetURI}">Open in VS Code</a>`,
    };
  };
}

export function vscodeWindowsRemoteEditorResolver(): WorkspaceEditorTargetResolver<
  WorkspaceEditorTarget
> {
  return (src, line) => {
    if (src.startsWith("file:")) {
      src = path.fromFileUrl(src);
    }
    if (!src.startsWith("/")) src = `/${src}`;
    const editableTargetURI = `vscode://file${src}:${line || 1}`;
    return {
      identity: "vscode-windows",
      editableTargetURI,
      // deno-fmt-ignore
      openInWorkspaceHTML: (classes) =>`<a href="${editableTargetURI}" ${classes ? ` class="${classes}"` : ""} title="${editableTargetURI}">Open in VS Code</a>`,
    };
  };
}

export function vscodeLinuxRemoteEditorResolver(): WorkspaceEditorTargetResolver<
  WorkspaceEditorTarget
> {
  return (src, line) => {
    if (src.startsWith("file:")) {
      src = path.fromFileUrl(src);
    }
    if (!src.startsWith("/")) src = `/${src}`;
    const editableTargetURI = `vscode://file${src}:${line || 1}`;
    return {
      identity: "vscode-linux",
      editableTargetURI,
      // deno-fmt-ignore
      openInWorkspaceHTML: (classes) =>`<a href="${editableTargetURI}" ${classes ? ` class="${classes}"` : ""} title="${editableTargetURI}">Open in VS Code</a>`,
    };
  };
}

export function vscodeMacRemoteEditorResolver(): WorkspaceEditorTargetResolver<
  WorkspaceEditorTarget
> {
  return (src, line) => {
    if (src.startsWith("file:")) {
      src = path.fromFileUrl(src);
    }
    if (!src.startsWith("/")) src = `/${src}`;
    const editableTargetURI = `vscode://file${src}:${line || 1}`;
    return {
      identity: "vscode-mac",
      editableTargetURI,
      // deno-fmt-ignore
      openInWorkspaceHTML: (classes) =>`<a href="${editableTargetURI}" ${classes ? ` class="${classes}"` : ""} title="${editableTargetURI}">Open in VS Code</a>`,
    };
  };
}
