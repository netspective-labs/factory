import * as notif from "../../../../notification/mod.ts";
import * as c from "../../../content/mod.ts";
import * as aiM from "../../../model/action-item.ts";
import * as mdDS from "../../../markdown/mod.ts";
import * as lds from "../mod.ts";

export interface RegisterActionItemsOptions {
  readonly onInvalidResource?: (diagnostics: string) => void;
  readonly onInvalidModel?: (diagnostics: string) => void;
  readonly constructNotification?: (
    ais: aiM.ActionItemsSupplier,
  ) => lds.LightningNavigationNotification | undefined;
  readonly onNotificationAssignmentFailed?: (diagnostic: string) => void;
}

export function registerActionItemsConsoleErrorReporter(
  origin: string,
): RegisterActionItemsOptions {
  return {
    onInvalidModel: (message) =>
      console.error(`${message} (${origin} onInvalidModel)`),
    onInvalidResource: (message) =>
      console.error(`${message} (${origin} onInvalidModel)`),
    onNotificationAssignmentFailed: (message) =>
      console.error(`${message} (${origin} onInvalidModel)`),
  };
}

export function registerActionItems<Resource>(
  resource: Resource,
  options: RegisterActionItemsOptions | undefined,
  ...actionItems: aiM.ActionItem[]
): void {
  const notification = options?.constructNotification || ((
    ais: aiM.ActionItemsSupplier,
  ): lds.LightningNavigationNotification => {
    return {
      count: () => ais.actionItems.length,
      identity: aiM.ToDoActionItem,
      icon: "task",
      subject: "Action Item",
    };
  });

  if (c.isModelSupplier(resource)) {
    if (aiM.isActionItemsSupplier(resource.model)) {
      // there's already an action item being tracked, let's just add it;
      // resource.route isLightningNavigationNotificationSupplier will
      // be true and resource.model.contentTODOs is referenced in that
      // instance so adding it contentTODOs.push(todo) will update it.
      resource.model.actionItems.push(...actionItems);
    } else {
      // this is the first action item so let's create the array and track in Model
      resource.model.actionItems = actionItems;
      if (!aiM.isActionItemsModelSupplier(resource)) {
        if (options?.onInvalidModel) {
          options.onInvalidModel(
            "isActionItemsModelSupplier(resource) is false for some reason",
          );
        }
        return;
      }

      // the following now makes resource's route a lds.LightningNavigationNotificationSupplier
      // which will get picked up in Lightning design system navigation to show notification
      // values in navigation and other components
      const instance = notification(resource.model);
      if (instance) {
        notif.prepareNotifications(
          resource.model,
          () => ({
            collection: [instance],
          }),
          (lnn) => notif.mergeNotifications(instance, lnn),
          options?.onNotificationAssignmentFailed,
        );
      }
    }
  } else {
    if (options?.onInvalidResource) {
      options.onInvalidResource(
        "m.isModelSupplier(resource) is false in ToDoDirective.encountered",
      );
    }
  }
}

export class ActionItemDirective implements
  c.DirectiveExpectation<
    mdDS.MarkdownContentInlineDirective<aiM.ActionItemDirectiveAttrs<string>>,
    string | undefined
  > {
  readonly identity = aiM.ToDoActionItem;

  encountered(
    d: mdDS.MarkdownContentInlineDirective<
      aiM.ActionItemDirectiveAttrs<string>
    >,
  ): string | undefined {
    let diagnostic: string | undefined = undefined;
    const resource = d.markdownRenderEnv.resource;
    if (resource) {
      const todo: aiM.ActionItem = {
        ...d.attributes,
        type: aiM.ToDoActionItem,
        subject: d.content,
      };
      const diagnose = (message: string) => {
        diagnostic = `<mark>${message}</mark>`;
      };
      registerActionItems(resource, {
        onInvalidResource: diagnose,
        onInvalidModel: diagnose,
        onNotificationAssignmentFailed: diagnose,
      }, todo);
    } else {
      diagnostic =
        `<br><mark>d.renderEnv.resource in ToDoDirective.encountered() is undefined in ToDoDirective.encountered</mark>`;
    }

    // deno-fmt-ignore
    return `<span class="slds-badge .slds-theme_success">
          <span class="slds-badge__icon slds-badge__icon_left">
            <span class="slds-icon_container slds-icon-utility-task slds-current-color" title="TODO for ${d.attributes?.for}">
              <svg class="slds-icon slds-icon_xx-small" aria-hidden="true">
                <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#task"></use>
              </svg>
            </span>
          </span>
          ${d.attributes?.for}
        </span>
        <mark data-role="TODO" data-todo-for="${d.attributes?.for}">${d.content}</mark>${diagnostic || ''}\n`;
  }
}
