import simpleGit from "simple-git";

export async function commitAndPush(
  repoDir: string,
  branchName: string,
  commitMessage: string,
  cloneUrl: string,
  token: string
) {
  const git = simpleGit(repoDir);
  await git.checkoutLocalBranch(branchName);
  await git.add(["-A"]);
  await git.addConfig("user.email", "codepilot-agent@example.local");
  await git.addConfig("user.name", "CodePilot Agent");
  await git.commit(commitMessage);

  const authedUrl = cloneUrl.replace("https://", `https://x-access-token:${token}@`);
  await git.push(authedUrl, branchName, ["--set-upstream"]);
}
