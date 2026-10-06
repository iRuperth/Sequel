export const noCommentsRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow comments of any kind in source files",
    },
    messages: {
      forbidden: "Comments are not allowed in this codebase.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: "forbidden" })
        }
      },
    }
  },
}

export const sequelPlugin = {
  meta: { name: "sequel" },
  rules: {
    "no-comments": noCommentsRule,
  },
}
