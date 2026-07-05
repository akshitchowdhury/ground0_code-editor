package db

import (
	"embed"
	"errors"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate runs all pending migrations against databaseURL. Run automatically
// at startup (idempotent — every migration here is IF NOT EXISTS/IF EXISTS),
// matching Express's boot-time `pool.query(SCHEMA)` zero-setup experience,
// while still giving the Go service a real migration history going forward.
func Migrate(databaseURL string) error {
	src, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("migrate: load embedded fs: %w", err)
	}
	// golang-migrate's pgx/v5 driver registers itself under the "pgx5"
	// scheme, not "postgres" — rewrite the standard libpq-style DATABASE_URL
	// (used everywhere else, e.g. pgxpool.New) so migrate can find it.
	migrateURL := "pgx5://" + strings.TrimPrefix(strings.TrimPrefix(databaseURL, "postgres://"), "postgresql://")
	m, err := migrate.NewWithSourceInstance("iofs", src, migrateURL)
	if err != nil {
		return fmt.Errorf("migrate: init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate: up: %w", err)
	}
	return nil
}
