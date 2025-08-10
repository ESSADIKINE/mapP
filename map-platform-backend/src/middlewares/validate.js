export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: parsed.error.flatten()
      });
    }
    req[source] = parsed.data;
    next();
  };
