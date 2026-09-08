# The Sonar analysis runs itself and sees no coverage

## Applies when

Reading or changing what SonarCloud reports for this repository — the ratings on
the project page, the quality gate, which files are in scope.

**Not this if**: the question is what a specific finding means. The rating
mechanics and the framework blind spots behind the largest finding class are
general Sonar knowledge, not repository knowledge, and they are not repeated
here.

## Nothing in a workflow triggers it

There is no scanner step in `.github/workflows/` and no `sonar-project.properties`,
by design: the project is analysed by SonarCloud's **automatic analysis**, which
pulls the repository itself and analyses every push about a minute after it lands.
Nothing in this repository starts, delays or skips that.

Two consequences:

- A finding can appear without anyone running anything, and it appears against
  `master` as soon as the push is there — the same push that cuts the release.
- Local reproduction is not available. What the analysis thinks is visible only
  through the project page or the web API.

## `.sonarcloud.properties` is the only knob here

`.sonarcloud.properties` is read from the default branch only, and it is the sole
piece of Sonar configuration that lives in the repository. It currently takes
`scripts/` out of scope, because the vendoring script's whole job is to read a
path a developer names on the command line, which a taint rule reports as a
finding. The cost of that exclusion is that nothing in `scripts/` is analysed at
all any more.

Rules cannot be configured from here. Activating or deactivating one is a quality
profile in the SonarCloud organization, so a change of that kind needs
administration rights and cannot be prepared as a pull request.

## Coverage never arrives

`test.yml` already runs the suite with `--code-coverage` and writes lcov, and none
of it reaches Sonar: automatic analysis reads no coverage report. The project page
therefore shows no coverage measure and the quality gate has no coverage
condition — a green gate says nothing about how much of this code is tested.
Getting coverage in would mean replacing automatic analysis with a scanner step in
CI, which is a different setup, not a setting.
