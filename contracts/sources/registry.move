module shohub::registry {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_EMPTY: u64 = 3;
    const E_TOO_LONG: u64 = 4;
    const E_ALREADY_REGISTERED: u64 = 5;

    const MAX_NAME: u64 = 96;
    const MAX_URI: u64 = 512;
    const MAX_CATEGORY: u64 = 32;

    struct Registry has key {
        admin: address,
        total_projects: u64,
    }

    struct Project has copy, drop, store {
        project_id: vector<u8>,
        creator: address,
        name: String,
        category: String,
        metadata_uri: String,
        created_at: u64,
    }

    struct Projects has key {
        items: vector<Project>,
    }

    public entry fun initialize(account: &signer) {
        assert!(!exists<Registry>(signer::address_of(account)), error::already_exists(E_ALREADY_REGISTERED));
        move_to(account, Registry {
            admin: signer::address_of(account),
            total_projects: 0,
        });
        move_to(account, Projects { items: vector::empty<Project>() });
    }

    public entry fun register_project(
        account: &signer,
        project_id: vector<u8>,
        name: String,
        category: String,
        metadata_uri: String,
        created_at: u64,
    ) {
        let owner = signer::address_of(account);
        assert!(exists<Registry>(owner), error::not_found(E_NOT_INITIALIZED));
        assert!(vector::length(&project_id) > 0, error::invalid_argument(E_EMPTY));
        assert!(string::length(&name) > 0, error::invalid_argument(E_EMPTY));
        assert!(string::length(&name) <= MAX_NAME, error::invalid_argument(E_TOO_LONG));
        assert!(string::length(&category) > 0, error::invalid_argument(E_EMPTY));
        assert!(string::length(&category) <= MAX_CATEGORY, error::invalid_argument(E_TOO_LONG));
        assert!(string::length(&metadata_uri) > 0, error::invalid_argument(E_EMPTY));
        assert!(string::length(&metadata_uri) <= MAX_URI, error::invalid_argument(E_TOO_LONG));

        let projects = borrow_global_mut<Projects>(owner);
        let i = 0;
        while (i < vector::length(&projects.items)) {
            let existing = vector::borrow(&projects.items, i);
            assert!(existing.project_id != project_id, error::already_exists(E_ALREADY_REGISTERED));
            i = i + 1;
        };

        vector::push_back(&mut projects.items, Project {
            project_id,
            creator: owner,
            name,
            category,
            metadata_uri,
            created_at,
        });
        let registry = borrow_global_mut<Registry>(owner);
        registry.total_projects = registry.total_projects + 1;
    }

    public entry fun update_metadata(
        account: &signer,
        project_id: vector<u8>,
        metadata_uri: String,
    ) {
        let owner = signer::address_of(account);
        assert!(exists<Registry>(owner), error::not_found(E_NOT_INITIALIZED));
        assert!(string::length(&metadata_uri) > 0, error::invalid_argument(E_EMPTY));
        assert!(string::length(&metadata_uri) <= MAX_URI, error::invalid_argument(E_TOO_LONG));

        let projects = borrow_global_mut<Projects>(owner);
        let i = 0;
        let found = false;
        while (i < vector::length(&projects.items)) {
            let existing = vector::borrow_mut(&mut projects.items, i);
            if (existing.project_id == project_id) {
                existing.metadata_uri = metadata_uri;
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, error::not_found(E_NOT_AUTHORIZED));
    }

    #[view]
    public fun total_projects(owner: address): u64 {
        if (!exists<Registry>(owner)) {
            return 0
        };
        borrow_global<Registry>(owner).total_projects
    }

    #[view]
    public fun project_count(owner: address): u64 {
        if (!exists<Projects>(owner)) {
            return 0
        };
        vector::length(&borrow_global<Projects>(owner).items)
    }

    #[view]
    public fun is_initialized(owner: address): bool {
        exists<Registry>(owner)
    }

    #[view]
    public fun metadata_uri(owner: address, project_id: vector<u8>): String acquires Projects {
        assert!(exists<Projects>(owner), error::not_found(E_NOT_INITIALIZED));
        let projects = borrow_global<Projects>(owner);
        let i = 0;
        while (i < vector::length(&projects.items)) {
            let existing = vector::borrow(&projects.items, i);
            if (existing.project_id == project_id) {
                return existing.metadata_uri
            };
            i = i + 1;
        };
        abort error::not_found(E_NOT_AUTHORIZED)
    }

    #[test(account = @shohub)]
    fun initialize_and_register(account: &signer) acquires Registry, Projects {
        initialize(account);
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project-1"),
            1,
        );
        assert!(total_projects(signer::address_of(account)) == 1, 100);
        assert!(project_count(signer::address_of(account)) == 1, 101);
        assert!(is_initialized(signer::address_of(account)), 102);
        assert!(
            metadata_uri(signer::address_of(account), b"project-1")
                == string::utf8(b"neon://project-1"),
            103
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x80005, location = Self)]
    fun duplicate_initialize_rejected(account: &signer) {
        initialize(account);
        initialize(account);
    }

    #[test(account = @shohub)]
    fun empty_account_is_safe_to_read(account: &signer) {
        let owner = signer::address_of(account);
        assert!(!is_initialized(owner), 200);
        assert!(total_projects(owner) == 0, 201);
        assert!(project_count(owner) == 0, 202);
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x60001, location = Self)]
    fun registration_requires_initialization(account: &signer) {
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project-1"),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x60001, location = Self)]
    fun metadata_update_requires_initialization(account: &signer) {
        update_metadata(account, b"project-1", string::utf8(b"neon://project-2"));
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x80005, location = Self)]
    fun duplicate_project_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        let id = b"project-1";
        register_project(
            account,
            id,
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project-1"),
            1,
        );
        register_project(
            account,
            id,
            string::utf8(b"Shohub again"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project-1"),
            2,
        );
    }

    #[test(account = @shohub)]
    fun metadata_update_is_visible(account: &signer) acquires Registry, Projects {
        let owner = signer::address_of(account);
        initialize(account);
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project-1"),
            1,
        );
        update_metadata(account, b"project-1", string::utf8(b"neon://project-1-v2"));
        assert!(
            metadata_uri(owner, b"project-1") == string::utf8(b"neon://project-1-v2"),
            300
        );
        assert!(total_projects(owner) == 1, 301);
        assert!(project_count(owner) == 1, 302);
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x60002, location = Self)]
    fun metadata_update_rejects_unknown_project(account: &signer) acquires Projects {
        initialize(account);
        update_metadata(account, b"missing", string::utf8(b"neon://missing"));
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x60002, location = Self)]
    fun metadata_read_rejects_unknown_project(account: &signer) acquires Projects {
        initialize(account);
        metadata_uri(signer::address_of(account), b"missing");
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x60001, location = Self)]
    fun metadata_read_requires_initialization(account: &signer) {
        metadata_uri(signer::address_of(account), b"missing");
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun empty_project_id_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        register_project(
            account,
            vector::empty<u8>(),
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project"),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun empty_name_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        register_project(
            account,
            b"project-1",
            string::utf8(b""),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project"),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun empty_category_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b""),
            string::utf8(b"neon://project"),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun empty_metadata_uri_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b""),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10004, location = Self)]
    fun oversized_name_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        let oversized = vector::empty<u8>();
        let i = 0;
        while (i < MAX_NAME + 1) {
            vector::push_back(&mut oversized, 97);
            i = i + 1;
        };
        register_project(
            account,
            b"project-1",
            string::utf8(oversized),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project"),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10004, location = Self)]
    fun oversized_category_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        let oversized = vector::empty<u8>();
        let i = 0;
        while (i < MAX_CATEGORY + 1) {
            vector::push_back(&mut oversized, 97);
            i = i + 1;
        };
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(oversized),
            string::utf8(b"neon://project"),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10004, location = Self)]
    fun oversized_uri_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        let oversized = vector::empty<u8>();
        let i = 0;
        while (i < MAX_URI + 1) {
            vector::push_back(&mut oversized, 97);
            i = i + 1;
        };
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(oversized),
            1,
        );
    }

    #[test(account = @shohub)]
    #[expected_failure(abort_code = 0x10004, location = Self)]
    fun oversized_updated_uri_rejected(account: &signer) acquires Registry, Projects {
        initialize(account);
        register_project(
            account,
            b"project-1",
            string::utf8(b"Shohub"),
            string::utf8(b"Storage"),
            string::utf8(b"neon://project"),
            1,
        );
        let oversized = vector::empty<u8>();
        let i = 0;
        while (i < MAX_URI + 1) {
            vector::push_back(&mut oversized, 97);
            i = i + 1;
        };
        update_metadata(account, b"project-1", string::utf8(oversized));
    }
}
