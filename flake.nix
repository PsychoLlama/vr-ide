{
  description = "Development environment";

  inputs = {
    systems.url = "github:nix-systems/default";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
    }:

    let
      inherit (nixpkgs) lib;

      eachSystem = lib.flip lib.mapAttrs (
        lib.genAttrs (import systems) (system: nixpkgs.legacyPackages.${system})
      );
    in

    {
      devShell = eachSystem (
        system: pkgs:
        pkgs.mkShell {
          packages = [
            pkgs.nodejs
            pkgs.pnpm
            pkgs.just
            pkgs.treefmt
            pkgs.python3  # Required for node-gyp (native modules)
          ];
        }
      );
    };
}
