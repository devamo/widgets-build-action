# Hello world javascript action
Action create release with artifacts (sources.zip, bundle.zip)

## Inputs

### `github-token`

**Required** Github access token.

## Outputs

### `time`

The time we greeted you.

## Example usage
```yml
uses: actions/devamo/widgets-build-action@v1
with:
  github-token: 'your_token'
```