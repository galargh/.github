const core = require('@actions/core');

try {
  core.setOutput("test_output", "This is an output")
} catch (error) {
  core.setFailed(error.message);
}
