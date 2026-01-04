package org.team3.helmetdetection.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.team3.helmetdetection.models.Account;

import java.util.Optional;

public interface AccountRepo extends JpaRepository<Account,Integer> {
    Optional<Account> findByUsernameAndPassword(String username, String password);
}
