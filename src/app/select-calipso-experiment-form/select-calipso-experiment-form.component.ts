import { Component, OnInit } from "@angular/core";
import { CalipsoplusService } from "../calipsoplus.service";
import { CalipsoExperiment } from "../calipso-experiment";

import { Router } from "@angular/router";
import { CalipsoContainer } from "../calipso-container";

import { CalipsoQuota } from "../calipso-quota";
import { CalipsoPaginationExperiment } from "../calipso-pagination-experiment";

export enum Status {
  idle = 0, // ready
  busy = 1, // waitting
  running = 2, // runing
  full = 3, // forbidden
  error = 4 // error
}

@Component({
  selector: "app-select-calipso-experiment-form",
  templateUrl: "./select-calipso-experiment-form.component.html",
  styleUrls: ["./select-calipso-experiment-form.component.css"]
})
export class SelectCalipsoExperimentFormComponent implements OnInit {
  pagination: CalipsoPaginationExperiment = new CalipsoPaginationExperiment(0,'','',0,[]);
  actual_page: number = 0;
  total_pages: number[]=[];

  experiments: CalipsoExperiment[];
  containers: CalipsoContainer[];

  used_quota: CalipsoQuota[];
  user_quota: CalipsoQuota[];

  statusActiveExperiments: { [key: string]: Status } = {};

  max_num_machines_exceeded: Boolean = false;
  max_num_cpu_exceeded: Boolean = false;
  max_memory_exceeded: Boolean = false;
  max_hdd_exceeded: Boolean = false;

  safe_locked_button: Boolean = false;

  constructor(
    private calipsoService: CalipsoplusService,
    private router: Router
  ) {}

  private check_quota() {
    let username = this.calipsoService.getLoggedUserName();
    this.calipsoService
      .getCalipsoAvailableImageQuota(username)
      .subscribe(used => {
        this.used_quota = used;

        this.calipsoService.getCalipsoQuota(username).subscribe(user_quota => {
          this.user_quota = user_quota;

          let max_available =
            this.user_quota[0].max_simultaneous -
            this.used_quota[0].max_simultaneous;
          let cpu_available = this.user_quota[0].cpu - this.used_quota[0].cpu;
          let hdd_available =
            parseInt(this.user_quota[0].hdd.slice(0, -1)) -
            parseInt(this.used_quota[0].hdd.slice(0, -1));
          let memory_available =
            parseInt(this.user_quota[0].memory.slice(0, -1)) -
            parseInt(this.used_quota[0].memory.slice(0, -1));

          this.max_num_machines_exceeded = max_available <= 0;

          this.calipsoService
            .getImageByPublicName("base_image")
            .subscribe(image_quota => {
              this.max_num_cpu_exceeded =
                cpu_available - image_quota[0].cpu < 0;
              this.max_memory_exceeded =
                memory_available -
                  parseInt(image_quota[0].memory.slice(0, -1)) <
                0;
              this.max_hdd_exceeded =
                hdd_available - parseInt(image_quota[0].hdd.slice(0, -1)) < 0;
            });
        });
      });
  }

  public compare_if_disabled(bol:boolean){
    if(bol)return("disabled");
    else return("");
  }
  public compare_if_active(bol:boolean){
    if(bol)return("active");
    else return("");
  }


public showPage(page:number){
  let total_pages= this.pagination.count/this.pagination.page_size;
  let medium_pages:boolean = false;//(total_pages/2-1<page)&&(page<total_pages/2+2);
  let actual:boolean = this.actual_page==page;
  let near:boolean = (this.actual_page-3<page)&&(page<this.actual_page+3)

  return (page<3||actual||near||medium_pages||page>total_pages-1);
}

  public load_experiments(page: number) {
    if (this.experiments) this.experiments.splice(0, this.experiments.length);

    if (this.calipsoService.isLogged()) {
      this.actual_page = page;
      let username = this.calipsoService.getLoggedUserName();
      this.safe_locked_button = false;

      //get all containers active from user
      this.calipsoService.listContainersActive(username).subscribe(res => {
        this.containers = res;

        // get all experiments for a username
        this.calipsoService
          .getCalipsoExperiments(username, this.actual_page)
          .subscribe(experiment => {
            this.pagination = experiment;
            this.experiments = this.pagination.results;

            if (this.total_pages) this.total_pages.splice(0, this.total_pages.length);
            for (let i: number = 0; i < this.pagination.count/this.pagination.page_size; i++) {
              this.total_pages.push(i+1);
            }

            // search experiment in container
            this.experiments.forEach(element => {
              var c = this.containers.find(
                x => x.calipso_experiment == element.serial_number
              );
              this.check_quota();
              if (c == null) {
                this.statusActiveExperiments[element.serial_number] =
                  Status.idle;
              } else {
                this.check_quota();

                switch (c.container_status) {
                  case "busy": {
                    this.statusActiveExperiments[element.serial_number] =
                      Status.busy;
                    break;
                  }
                  case "created": {
                    this.statusActiveExperiments[element.serial_number] =
                      Status.running;
                    break;
                  }
                  case "stopped":
                  case "removed": {
                    this.statusActiveExperiments[element.serial_number] =
                      Status.idle;
                    break;
                  }
                  default: {
                    this.statusActiveExperiments[element.serial_number] =
                      Status.error;
                    break;
                  }
                }
                this.safe_locked_button = false;
              }
            });
          });
      });
    } else {
      this.router.navigate(["login"]);
    }
  }

  ngOnInit() {
    this.load_experiments(1);
  }

  public run(experiment_serial_number: string) {
    this.statusActiveExperiments[experiment_serial_number] = Status.busy;
    this.safe_locked_button = true;
    let username = this.calipsoService.getLoggedUserName();

    this.calipsoService
      .runContainer(
        this.calipsoService.getLoggedUserName(),
        experiment_serial_number
      )
      .subscribe(
        data => {
          if (data != null) {
            this.containers.push(data);

            this.check_quota();

            this.statusActiveExperiments[experiment_serial_number] =
              Status.running;
          } else {
            this.statusActiveExperiments[experiment_serial_number] =
              Status.idle;
          }
          this.safe_locked_button = false;
        },
        error => {
          this.statusActiveExperiments[experiment_serial_number] = Status.idle;
          this.safe_locked_button = false;
          alert("Ooops!");
        }
      );
  }

  public stop_and_remove_container(experiment_serial_number: string) {
    let username = this.calipsoService.getLoggedUserName();
    var temporalyActiveExperiments: { [key: string]: Status } = {};
    this.safe_locked_button = true;

    this.statusActiveExperiments[experiment_serial_number] = Status.busy;

    var c = this.containers.find(
      x => x.calipso_experiment == experiment_serial_number
    );

    this.calipsoService
      .stopContainer(username, c.container_name)
      .subscribe(data => {
        this.containers.find(x => x.id == data.id).container_status =
          data.container_status;

        this.calipsoService
          .removeContainer(username, c.container_name)
          .subscribe(cdata => {
            this.containers.find(x => x.id == cdata.id).container_status =
              cdata.container_status;

            this.containers.forEach((item, index) => {
              if (item.container_name === cdata.container_name)
                this.containers.splice(index, 1);
              this.calipsoService.removeDateAccess(cdata.container_name);
            });

            this.statusActiveExperiments[cdata.calipso_experiment] =
              Status.idle;
            this.safe_locked_button = false;

            this.check_quota();
          });
      });
  }

  public go_in(experiment_serial_number: string) {
    var c = this.containers.find(
      x => x.calipso_experiment == experiment_serial_number
    );
    if (c == null) alert("error win up");
    else
      this.calipsoService.go_into_container(
        c.container_name,
        c.guacamole_username,
        c.guacamole_password
      );
  }
}
