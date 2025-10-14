export default {
  providers: [
    {
      domain: process.env.TODO_SITE_URL || process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
    {
      domain: process.env.TRACKER_SITE_URL,
      applicationID: "convex",
    },
  ],
};
