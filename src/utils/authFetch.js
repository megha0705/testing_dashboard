export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("admin_token");
  console.log("HERE IS THE TOKEN",localStorage.getItem("admin_token"));

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
        await new Promise(resolve => setTimeout(resolve, 30000));
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  return response;
};
