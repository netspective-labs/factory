import * as ax from "../../axiom/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as eng from "../engine/engine.ts";
import * as ex from "../execute/mod.ts";

// see:
// [GitLab Postgres Schema Design](https://shekhargulati.com/2022/07/08/my-notes-on-gitlabs-postgres-schema-design/)

// deno-lint-ignore no-explicit-any
type Any = any;

export const glQualifiedComponentsDelim = ":/:";

export interface GitLabSqlEmitContext extends SQLa.SqlEmitContext {
  readonly qualifiedComponentsDelim: string;
}

export function gitLabSqlEmitContext<
  Context extends GitLabSqlEmitContext,
>(): Context {
  return {
    qualifiedComponentsDelim: glQualifiedComponentsDelim,
    ...SQLa.typicalSqlEmitContext(),
  } as Context;
}

export const gitLabNamespace = SQLa.sqlDomains({
  id: SQLa.integer(),
  name: SQLa.text(),
  path: SQLa.text(),
  description: SQLa.text(),
  avatar: SQLa.text(),
  parent_id: SQLa.integerNullable(),
});
export type GitLabNamespace = ax.AxiomType<typeof gitLabNamespace>;

export function gitLabSqlBuilder<Context extends GitLabSqlEmitContext>() {
  return {
    text: () => SQLa.text<Context>(),
    int: () => SQLa.integer<Context>(),
    dateTime: () => SQLa.dateTime<Context>(),
  };
}

export function gitLabSqlStmts() {
  const glsBuilder = gitLabSqlBuilder<GitLabSqlEmitContext>();
  const { text, int, dateTime } = glsBuilder;

  const group = (ctx: GitLabSqlEmitContext, name: string) =>
    SQLa.typedSelect(gitLabNamespace.axiomObjectDecl, ctx)`
        SELECT id, parent_id, name, path, description, avatar
          FROM namespaces
         WHERE name = '${name}' and type = 'Group'`;

  const groups = (ctx: GitLabSqlEmitContext) =>
    SQLa.typedSelect(gitLabNamespace.axiomObjectDecl, ctx)`
        SELECT id, parent_id, name, path, description, avatar
          FROM namespaces
         WHERE type = 'Group'`;

  const issues = (ctx: GitLabSqlEmitContext, ns: GitLabNamespace) =>
    SQLa.typedSelect({
      groupURL: text(),
      groupPathComponent: text(),
      groupNameQualified: text(),
      groupDescription: text(),
      projectPath: text(),
      projectName: text(),
      projectNameQualified: text(),
      projectDescription: text(),
      assignmentId: int(),
      assignmentIID: int(),
      projectURL: text(),
      assignmentTitleHTML: text(),
      assignmentDescriptionHTML: text(),
      assignmentTitle: text(),
      assignmentDescription: text(),
      assignmentCreatedByUserName: text(),
      assignmentCreatedByUserID: int(),
      assignmentCreatedAt: dateTime(),
      assignmentDueOn: dateTime(),
      assignmentDueInDays: int(),
      todosCount: int(),
      viewedCount: int(),
      completedCount: int(),
      irrelevantCount: int(),
      ignoredCount: int(),
      // TODO: authorizedUserIds: number[];
      // TODO: assignedUserIds: number[];
      // TODO: mentionedUserIds: number[];
      // TODO: viewedByUserIds: number[];
      // TODO: completedByUserIds: number[];
      // TODO: irrelevantByUserIds: number[];
    }, ctx)`
        WITH groups_cte (id) AS (
            /* Find all children of given group ID (e.g. 'Precision Knowledge Content') */
            WITH RECURSIVE childNS AS (
            SELECT ${ns.id} AS id
            UNION ALL
            SELECT ns.id
            FROM namespaces AS ns
            JOIN childNS ON childNS.id = ns.parent_id
            ) SELECT id FROM childNS),
        projects_cte (id) AS (
            /* Find all projects in the descendants of given group ID (e.g. 'Precision Knowledge Content') */
            select id from projects p
            where p.namespace_id in (select id from groups_cte)
        ),
        authorized_users_cte (project_id, user_id, access_level) as (
            /* Find all users who are authorized in projects_cte */
            select project_id, user_id, access_level
                from project_authorizations pa
                where pa.project_id in (select id from projects_cte)
        ),
        issues_cte (project_id, issue_id, issue_iid, issue_author_id, title, title_html, description, description_html, created_at, due_date) AS (
            /* Find all issues in projects_cte */
            select project_id, i.id, iid, i.author_id, title, title_html, description, description_html, created_at, due_date
            from issues i
            where i.project_id in (select id from projects_cte)
        ),
        mentioned_in_issues_cte (project_id, issue_id, user_id) AS (
            /* Find all mentionees in issues in projects_cte */
            select distinct project_id, i.issue_id, unnest(ium.mentioned_users_ids) as user_id
            from issue_user_mentions ium, issues_cte i
            where ium.issue_id = i.issue_id
        ),
        assigned_issues_cte (project_id, user_id, issue_id) AS (
            /* Find all assigned issues in projects_cte */
            select project_id, ia.user_id, ia.issue_id
            from issue_assignees ia, issues_cte i
            where ia.issue_id = i.issue_id
        )
        select project_id as "projectId",
            issue_id as "assignmentId",
            issue_iid as "assignmentIID",
            issue_author_id as "authorId",
            urls.level,
            urls.group_url as "groupURL",
            namespace.path as "groupPathComponent",
            namespace.name AS "groupName",
            namespace.description as "groupDescription",
            urls.group_name_qualified as "groupNameQualified",
            project.path as "projectPath",
            project.name as "projectName",
            project.description as "projectDescription",
            urls.project_url as "projectURL",
            urls.project_name_qualified as "projectNameQualified",
            assignment.title as "assignmentTitle",
            assignment.title_html as "assignmentTitleHTML",
            assignment.description as "assignmentDescription",
            assignment.description_html as "assignmentDescriptionHTML",
            assignment.created_at AS "assignmentCreatedAt",
            author.name as "assignmentCreatedByUserName",
            author.id as "assignmentCreatedByUserID",
            assignment.due_date as "assignmentDueOn",
            extract('day' from date_trunc('day', assignment.due_date) - now()) AS "assignmentDueInDays",
            counts.todos as "todosCount",
            counts.viewed as "viewedCount",
            counts.completed as "completedCount",
            counts.irrelevant as "irrelevantCount",
            (counts.todos - counts.viewed - counts.completed - counts.irrelevant) as "ignoredCount"
            -- COALESCE(authorized.users, '[]') AS "authorizedUserIds",
            -- COALESCE(assigned.users, '[]') AS "assignedUserIds",
            -- COALESCE(mentioned.users, '[]') AS "mentionedUserIds",
            -- COALESCE(viewedBy.users, '[]') AS "viewedByUserIds",
            -- COALESCE(completedBy.users, '[]') AS "completedByUserIds",
            -- COALESCE(irrelevantBy.users, '[]') AS "irrelevantByUserIds"
        from issues_cte assignment
        LEFT JOIN projects Project ON assignment.project_id = Project.id
        LEFT JOIN namespaces Namespace ON namespace_id = Namespace.id
        LEFT JOIN users Author ON assignment.issue_author_id = Author.id
        CROSS JOIN LATERAL(
            WITH RECURSIVE recursiveNS (id, level, path_component, abs_path, name_component, qualified_name) AS (
                SELECT  id, 0, path, path::text, name, name::text
                FROM    namespaces
                WHERE   parent_id is null
                UNION ALL
                SELECT  childNS.id, t0.level + 1, childNS.path, (t0.abs_path || '/' || childNS.path)::text, childNS.name, (t0.qualified_name || '${ctx.qualifiedComponentsDelim}' || childNS.name)::text
                FROM    namespaces childNS
                INNER JOIN recursiveNS t0 ON t0.id = childNS.parent_id)
            SELECT  level, abs_path::text, abs_path::text || '/' || Project.path, qualified_name, qualified_name::text || '${ctx.qualifiedComponentsDelim}' || Project.name
            FROM    recursiveNS
            WHERE   id = Namespace.id
        ) AS urls(level, group_url, project_url, group_name_qualified, project_name_qualified)
        CROSS JOIN LATERAL(SELECT
            (select count(*) from todos where target_id = assignment.issue_id and target_type = 'Issue'),
            (select count(*) from award_emoji where awardable_id = assignment.issue_id and name='eyeglasses'),
            (select count(*) from award_emoji where awardable_id = assignment.issue_id and name='negative_squared_cross_mark'),
            (select count(*) from award_emoji where awardable_id = assignment.issue_id and name='white_check_mark')
        ) AS counts(todos, viewed, irrelevant, completed)
        LEFT JOIN LATERAL (
            SELECT json_agg(au.user_id) AS users
            FROM   authorized_users_cte au
            WHERE  au.project_id = assignment.project_id
        ) authorized ON true
        LEFT JOIN LATERAL (
            SELECT json_agg(ai.user_id) AS users
            FROM   assigned_issues_cte ai
            WHERE  ai.issue_id = assignment.issue_id
        ) assigned ON true
        LEFT JOIN LATERAL (
            SELECT json_agg(mii.user_id) AS users
            FROM   mentioned_in_issues_cte as mii
            WHERE  mii.issue_id = assignment.issue_id
        ) mentioned ON true
        LEFT JOIN LATERAL (
            select json_agg(aw.user_id) as users
                from award_emoji aw
            where name = 'eyeglasses'
                and awardable_id = assignment.issue_id
                and awardable_type='Issue'
            ) viewedBy ON true
        LEFT JOIN LATERAL (
            select json_agg(aw.user_id) as users
                from award_emoji aw
            where name = 'white_check_mark'
                and awardable_id = assignment.issue_id
                and awardable_type='Issue'
            ) completedBy ON true
        LEFT JOIN LATERAL (
            select json_agg(aw.user_id) as users
                from award_emoji aw
            where name = 'negative_squared_cross_mark'
                and awardable_id = assignment.issue_id
                and awardable_type='Issue'
            ) irrelevantBy ON true
        ORDER BY project.name, assignment.created_at`;

  const userAnalytics = (ctx: GitLabSqlEmitContext, ns: GitLabNamespace) =>
    SQLa.typedSelect({
      id: int(),
      email: text(),
      name: text(),
      userName: text(),
      // todosCount: int(),
      // openTodosCount: int(),
      authoredIssuesCount: int(),
      assignedIssuesCount: int(),
      mentionedInIssuesCount: int(),
      viewedReactionsCount: int(),
      irrelevantReactionsCount: int(),
      completedReactionsCount: int(),
      incompleteMentionsCount: int(),
      ignoredMentionsCount: int(),
    }, ctx)`
      WITH groups_cte (id) AS (
        /* Find all children of given group ID (e.g. 'Precision Knowledge Content') */
        WITH RECURSIVE childNS AS (
          SELECT ${ns.id} AS id
          UNION ALL
          SELECT ns.id
          FROM namespaces AS ns
          JOIN childNS ON childNS.id = ns.parent_id
        ) SELECT id FROM childNS),
        projects_cte (id) AS (
          /* Find all projects in the descendants of given group ID (e.g. 'Precision Knowledge Content') */
          select id from projects p
          where p.namespace_id in (select id from groups_cte)
        ),
        issues_cte (project_id, issue_id, issue_author_id) AS (
          /* Find all issues in projects_cte */
          select project_id, i.id, i.author_id
            from issues i
          where i.project_id in (select id from projects_cte)
        ),
        mentioned_in_issues_cte (project_id, issue_id, user_id) AS (
          /* Find all assigned issues in projects_cte */
          select distinct project_id, i.issue_id, unnest(ium.mentioned_users_ids) as user_id
            from issue_user_mentions ium, issues_cte i
          where ium.issue_id = i.issue_id
        ),
        assigned_issues_cte (project_id, user_id, issue_id) AS (
          /* Find all assigned issues in projects_cte */
          select project_id, ia.user_id, ia.issue_id
            from issue_assignees ia, issues_cte i
          where ia.issue_id = i.issue_id
        )
        select u.id,
              u.email,
              u.name,
              u.username as "userName",
              counts.authored_issues "authoredIssuesCount",
              counts.assigned_issues "assignedIssuesCount",
              counts.mentioned_in_issues "mentionedInIssuesCount",
              counts.viewed_reactions "viewedReactionsCount",
              counts.irrelevant_reactions "irrelevantReactionsCount",
              counts.completed_reactions "completedReactionsCount",
              (counts.mentioned_in_issues - counts.completed_reactions - counts.irrelevant_reactions) "incompleteMentionsCount",
              (counts.mentioned_in_issues - counts.viewed_reactions) "ignoredMentionsCount"
        from project_authorizations pa
        join users u on u.id = pa.user_id
        cross join lateral (
          select (select count(*) from issues_cte where issue_author_id = u.id),
                (select count(*) from assigned_issues_cte where user_id = u.id),
                (select count(*) from mentioned_in_issues_cte miu where u.id = miu.user_id),
                (select count(*) from award_emoji aw, mentioned_in_issues_cte i where i.user_id = u.id and aw.user_id = i.user_id and awardable_id = i.issue_id and name='eyeglasses' and awardable_type='Issue'),
                (select count(*) from award_emoji aw, mentioned_in_issues_cte i where i.user_id = u.id and aw.user_id = i.user_id and awardable_id = i.issue_id and name='negative_squared_cross_mark' and awardable_type='Issue'),
                (select count(*) from award_emoji aw, mentioned_in_issues_cte i where i.user_id = u.id and aw.user_id = i.user_id and awardable_id = i.issue_id and name='white_check_mark' and awardable_type='Issue')
          ) as counts(authored_issues, assigned_issues, mentioned_in_issues, viewed_reactions, irrelevant_reactions, completed_reactions)
        where pa.project_id in (select id from projects_cte)
        group by u.id, counts.authored_issues, counts.assigned_issues, counts.mentioned_in_issues,
              counts.viewed_reactions, counts.irrelevant_reactions, counts.completed_reactions`;
  return {
    glsBuilder,
    group,
    groups,
    issues,
    userAnalytics,
  };
}

export function gitLabContent<Context extends GitLabSqlEmitContext>(
  readConnSupplier: (ctx: Context) => eng.SqlReadRecordsConn<Any, Any, Context>,
  glCtx = gitLabSqlEmitContext<Context>(),
) {
  const glSS = gitLabSqlStmts();
  const glPC = {
    group: async (name: string) => {
      const conn = readConnSupplier(glCtx);
      return await conn.firstRecordDQL<GitLabNamespace>(
        glCtx,
        glSS.group(glCtx, name),
      );
    },
    groups: async () => {
      const conn = readConnSupplier(glCtx);
      return await conn.recordsDQL<GitLabNamespace>(glCtx, glSS.groups(glCtx));
    },
    issues: async (group: GitLabNamespace) => {
      const conn = readConnSupplier(glCtx);
      const issuesStmt = glSS.issues(glCtx, group);
      const content = await conn.recordsDQL<ax.AxiomType<typeof issuesStmt>>(
        glCtx,
        issuesStmt,
        { enrich: ex.mutateRecordsBigInts },
      );
      return { group, content };
    },
    userAnalytics: async (group: GitLabNamespace) => {
      const conn = readConnSupplier(glCtx);
      const uaStmt = glSS.userAnalytics(glCtx, group);
      const content = await conn.recordsDQL<ax.AxiomType<typeof uaStmt>>(
        glCtx,
        uaStmt,
        { enrich: ex.mutateRecordsBigInts },
      );
      return { group, content };
    },
  };
  return glPC;
}
