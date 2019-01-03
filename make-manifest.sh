cat >docker-manifest.yml <<EOF
image: 'tkurki/signalk-server:$TRAVIS_BRANCH'
manifests:
  -
    image: 'tkurki/signalk-server:linux-amd64-$TRAVIS_BRANCH'
    platform:
      architecture: amd64
      os: linux
  -
    image: 'tkurki/signalk-server:linux-arm32v7-$TRAVIS_BRANCH'
    platform:
      architecture: arm
      variant: v7
      os: linux